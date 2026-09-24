/* ============================================================
 * ai.js · AI 与逻辑系统（V1.0.0 · 第三阶段）
 * AI 攀爬放宽 + 打击感（hitStop）
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.AI = {
  fragments: [],
  fragGeo: null,
  fragMatCache: new Map(),

  init(){
    this.fragGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    TBOX.Engine.spawnFragments = (pos, count, power, color) => this.spawnFragments(pos, count, power, color);
  },

  getFragMat(color){
    const key = color >>> 0;
    let m = this.fragMatCache.get(key);
    if(!m){
      m = new THREE.MeshStandardMaterial({
        color: key, emissive: 0x222228, emissiveIntensity: .4, roughness: .5
      });
      this.fragMatCache.set(key, m);
    }
    return m;
  },

  spawnFragments(pos, count, power, color){
    const mat = this.getFragMat(color);
    const Q = TBOX.Engine.Q || TBOX.DATA.QUALITY.mid;
    for(let i = 0; i < count; i++){
      const m = new THREE.Mesh(this.fragGeo, mat);
      m.position.set(
        pos.x + (Math.random() - 0.5) * 0.5,
        pos.y + (Math.random() - 0.5) * 0.6,
        pos.z + (Math.random() - 0.5) * 0.4
      );
      m.scale.setScalar(0.6 + Math.random() * 0.8);
      m.castShadow = false;
      TBOX.Engine.scene.add(m);
      this.fragments.push({
        mesh: m,
        vx: (Math.random() - 0.5) * power,
        vy: Math.random() * power * 0.8 + 2.5,
        vz: (Math.random() - 0.5) * power - 1.5,
        rx: (Math.random() - 0.5) * 14, ry: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14,
        life: 1.4 + Math.random() * 0.8,
        landed: false
      });
    }
    while(this.fragments.length > Q.maxFrags){
      const f = this.fragments.shift();
      TBOX.Engine.scene.remove(f.mesh);
    }
  },

  updateFragments(dt){
    const G = TBOX.DATA.GRAVITY;
    for(let i = this.fragments.length - 1; i >= 0; i--){
      const f = this.fragments[i];
      f.vy += G * 0.55 * dt;
      f.mesh.position.x += f.vx * dt;
      f.mesh.position.y += f.vy * dt;
      f.mesh.position.z += f.vz * dt;
      f.mesh.rotation.x += f.rx * dt;
      f.mesh.rotation.y += f.ry * dt;
      f.mesh.rotation.z += f.rz * dt;
      if(f.mesh.position.y < 0.07){
        f.mesh.position.y = 0.07;
        if(!f.landed){ f.landed = true; f.vy *= -0.3; f.vx *= 0.7; f.vz *= 0.7; }
        else { f.vy = 0; f.vx *= (1 - dt * 4); f.vz *= (1 - dt * 4); }
      }
      f.life -= dt;
      if(f.life < 0){ TBOX.Engine.scene.remove(f.mesh); this.fragments.splice(i, 1); }
      else if(f.life < 0.5) f.mesh.scale.multiplyScalar(1 - dt * 1.8);
    }
  },

  updateDummy(now, rawDt){
    const d = TBOX.Action.dummy;
    if(!d || !d.group) return;
    if(!d.alive && d.respawnAt && now >= d.respawnAt){
      d.group.visible = true;
      d.group.position.copy(d.pos);
      d.hp = TBOX.DATA.TARGET_HP;
      d.alive = true;
      d.spawnAnim = 1;
    }
    if(d.alive && d.spawnAnim > 0){
      d.spawnAnim = Math.max(0, d.spawnAnim - rawDt * 3.5);
      const s = 1 - d.spawnAnim;
      d.group.scale.set(1, Math.max(0.02, s), 1);
    }
  },

  knockDownEnemy(e, fromX, fromZ, force){
    if(!e || !e.alive || e.knockedDown) return;

    e.knockedDown = true;
    e.knockPhase = 'falling';
    e.knockTimer = 0;
    e.bounceCount = 0;

    const dx = e.group.position.x - fromX;
    const dz = e.group.position.z - fromZ;
    const dist = Math.hypot(dx, dz) || 1;
    const nx = dx / dist;
    const nz = dz / dist;

    const cosR = Math.cos(-e.group.rotation.y);
    const sinR = Math.sin(-e.group.rotation.y);
    const localX = nx * cosR - nz * sinR;
    const localZ = nx * sinR + nz * cosR;

    if(Math.abs(localX) > Math.abs(localZ)){
      e.knockDir = localX > 0 ? 2 : -2;
    } else {
      e.knockDir = localZ > 0 ? 1 : -1;
    }

    e.vx = nx * (force || 6.0);
    e.vz = nz * (force || 6.0);

    e.attackTimer = 0;
    e.attackType = 'none';
    e.hitResolved = false;
    e.sliding = false;
    e.dodging = false;
    e.blocking = false;

    TBOX.Audio.playHit && TBOX.Audio.playHit();
    TBOX.Engine.triggerShake && TBOX.Engine.triggerShake(0.35, 0.2);
  },

  /* ============================================================
   * 敌人 AI
   * ★ 第三阶段：攀爬放宽（玩家高度差 > 0.5 就爬）
   * ============================================================ */
  updateEnemy(dt, now){
    const e = TBOX.Action.enemy;
    const p = TBOX.Player;
    if(!e || !e.group || !p) return;

    const cfg = TBOX.DATA.ENEMY;

    if(!e.alive){
      if(now >= e.respawnAt) this.respawnEnemy(e);
      return;
    }

    if(e.knockedDown){
      e.group.position.x += e.vx * dt;
      e.group.position.z += e.vz * dt;
      e.vx *= (1 - dt * 3);
      e.vz *= (1 - dt * 3);
      return;
    }

    if(p.dead){
      e.aiState = 'idle';
      e.attackTimer = 0;
      e.attackType = 'none';
      e.speedFactor = TBOX.Utils.lerp(e.speedFactor, 0, Math.min(1, dt * 6));
      e.blocking = false;
      return;
    }

    if(e.attackCooldown > 0) e.attackCooldown -= dt;
    if(e.dodgeCooldown > 0) e.dodgeCooldown -= dt;
    if(e.blockCooldown > 0) e.blockCooldown -= dt;
    if(e.pushCooldown > 0) e.pushCooldown -= dt;
    if(e.strafeTimer > 0) e.strafeTimer -= dt;
    else { e.strafeDir *= -1; e.strafeTimer = 0.8 + Math.random() * 1.2; }

    if(e.blocking){
      e.blockTimer -= dt;
      const dx0 = p.x - e.group.position.x;
      const dz0 = p.z - e.group.position.z;
      const angle0 = Math.atan2(dx0, dz0);
      e.group.rotation.y = TBOX.Utils.lerpAngle(e.group.rotation.y, angle0, Math.min(1, dt * 12));
      e.speedFactor = TBOX.Utils.lerp(e.speedFactor, 0, Math.min(1, dt * 8));
      if(e.blockTimer <= 0){
        e.blocking = false;
        e.blockCooldown = cfg.blockCooldown;
      }
      return;
    }

    if(p.attackTimer > 0 && e.blockCooldown <= 0 && !e.dodging && !e.knockedDown){
      const dist0 = Math.hypot(p.x - e.group.position.x, p.z - e.group.position.z);
      if(dist0 < cfg.attackRange + 1.0 && Math.random() < cfg.blockChance * dt * 6){
        e.blocking = true;
        e.blockTimer = cfg.blockDuration;
        e.attackTimer = 0;
        e.attackType = 'none';
        e.sliding = false;
        return;
      }
    }

    const dx = p.x - e.group.position.x;
    const dz = p.z - e.group.position.z;
    const dist = Math.hypot(dx, dz);

    const angle = Math.atan2(dx, dz);
    e.group.rotation.y = TBOX.Utils.lerpAngle(e.group.rotation.y, angle, Math.min(1, dt * 12));

    if(e.climbing){
      e.climbTimer += dt;
      const cp = Math.min(1, e.climbTimer / TBOX.DATA.CLIMB_DUR);
      if(e.climbTarget){
        const q = TBOX.Utils.easeInOutCubic(cp);
        e.group.position.x = TBOX.Utils.lerp(e.climbStartX, e.climbTarget.x, q);
        e.group.position.z = TBOX.Utils.lerp(e.climbStartZ, e.climbTarget.z - (e.climbTarget.halfD || 0.5) + 0.2, q);
        e.group.position.y = TBOX.Utils.lerp(e.climbStartY, e.climbTarget.topY, q);
      }
      e.speedFactor = 0;
      if(e.climbTimer >= TBOX.DATA.CLIMB_DUR){
        e.climbing = false;
        e.climbTimer = 0;
      }
      return;
    }

    if(e.sliding){
      e.slideTimer += dt;
      if(e.slideTimer >= TBOX.DATA.SLIDE_DUR){
        e.sliding = false;
        e.slideTimer = 0;
        if(e.chainSlide > 0 && Math.random() < cfg.chainSlideChance){
          e.chainSlide--;
          this.startSlide(e);
        }
      } else {
        const speed = cfg.slideSpeed;
        e.group.position.x += e.slideDir.x * speed * dt;
        e.group.position.z += e.slideDir.z * speed * dt;
        e.speedFactor = 1;
        e.runPhase += dt * 6;
      }
      return;
    }

    if(e.dodging){
      e.dodgeTimer += dt;
      if(e.dodgeTimer >= TBOX.DATA.DODGE.sideDur){
        e.dodging = false;
        e.dodgeTimer = 0;
      } else {
        const rgtX = Math.cos(e.group.rotation.y);
        const rgtZ = -Math.sin(e.group.rotation.y);
        e.group.position.x += rgtX * e.dodgeDir * TBOX.DATA.DODGE.sideDist * dt;
        e.group.position.z += rgtZ * e.dodgeDir * TBOX.DATA.DODGE.sideDist * dt;
        e.speedFactor = 1;
      }
      return;
    }

    if(dist > cfg.detectRange){
      e.aiState = 'idle';
      e.speedFactor = TBOX.Utils.lerp(e.speedFactor, 0, Math.min(1, dt * 6));
      e.attackType = 'none';
      return;
    }

    /* ★ 第三阶段：攀爬条件放宽 —— 玩家比 NPC 高 0.5 以上就爬 */
    const playerHigher = (p.y - e.group.position.y) > 0.5;
    const playerOnStair = TBOX.Engine.isPlayerOnStair && TBOX.Engine.isPlayerOnStair();
    const shouldClimb = playerHigher || playerOnStair;

    if(dist > cfg.attackRange){
      e.aiState = 'chase';
      let speed = cfg.walkSpeed;
      let runPhaseAdd = 8;
      if(dist > 10.0){ speed = cfg.sprintSpeed; runPhaseAdd = 14; e.sprinting = true; }
      else if(dist > 5.0){ speed = cfg.runSpeed; runPhaseAdd = 11; e.sprinting = false; }
      else { speed = cfg.walkSpeed; runPhaseAdd = 8; e.sprinting = false; }

      if(!e.climbing && e.dodgeCooldown <= 0 && (shouldClimb || Math.random() < cfg.climbChance * dt * 2)){
        const fwd = new THREE.Vector3(dx / dist, 0, dz / dist);
        for(const s of TBOX.Engine.stairs){
          const sdx = s.x - e.group.position.x;
          const sdz = s.z - e.group.position.z;
          const sd = Math.hypot(sdx, sdz);
          if(sd > TBOX.DATA.CLIMB_RANGE * 1.5) continue;
          const dh = s.topY - e.group.position.y;
          if(dh <= 0.2 || dh > TBOX.DATA.CLIMB_MAX_HEIGHT) continue;
          const dot = fwd.x * (sdx / sd) + fwd.z * (sdz / sd);
          if(dot < 0.4) continue;
          e.climbing = true;
          e.climbTimer = 0;
          e.climbTarget = s;
          e.climbStartX = e.group.position.x;
          e.climbStartY = e.group.position.y;
          e.climbStartZ = e.group.position.z;
          e.dodgeCooldown = cfg.dodgeCooldown;
          return;
        }
      }

      if(dist > 3.0 && dist < 8.0 && !e.sliding && e.dodgeCooldown <= 0 && Math.random() < cfg.slideChance * dt * 6){
        e.chainSlide = Math.random() < cfg.chainSlideChance ? 2 : 0;
        this.startSlide(e);
        e.dodgeCooldown = cfg.dodgeCooldown;
        return;
      }

      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      e.group.position.x += nx * speed * dt;
      e.group.position.z += nz * speed * dt;
      e.runPhase += dt * runPhaseAdd;
      e.speedFactor = TBOX.Utils.lerp(e.speedFactor, 1, Math.min(1, dt * 10));
      e.attackType = 'none';
    } else {
      e.aiState = 'combat';

      const rgtX = Math.cos(e.group.rotation.y);
      const rgtZ = -Math.sin(e.group.rotation.y);
      e.group.position.x += rgtX * e.strafeDir * cfg.walkSpeed * 0.7 * dt;
      e.group.position.z += rgtZ * e.strafeDir * cfg.walkSpeed * 0.7 * dt;
      e.runPhase += dt * 8;
      e.speedFactor = TBOX.Utils.lerp(e.speedFactor, 1, Math.min(1, dt * 10));

      if(p.attackTimer > 0 && !e.dodging && e.dodgeCooldown <= 0 && Math.random() < cfg.dodgeChance * dt * 10){
        e.dodging = true;
        e.dodgeTimer = 0;
        e.dodgeDir = Math.random() < 0.5 ? 1 : -1;
        e.dodgeCooldown = cfg.dodgeCooldown;
      }

      if(!e.dodging && e.attackTimer <= 0 && e.attackCooldown <= 0 && e.pushCooldown <= 0 && !playerOnStair){
        if(Math.random() < cfg.pushPlayerChance * dt * 4){
          e.attackType = 'push';
          e.attackTimer = 0.45;
          e.attackCooldown = cfg.attackCooldown * 1.5;
          e.pushCooldown = 3.0;
          e.hitResolved = false;
        }
      }

      if(!e.dodging && e.attackTimer <= 0 && e.attackCooldown <= 0 && !playerOnStair){
        const facing = Math.cos(e.group.rotation.y - angle);
        if(facing < cfg.attackFacingDot) return;

        const types = cfg.attackTypes;
        e.attackType = types[Math.floor(Math.random() * types.length)];
        const dur = (e.attackType === 'leftKick' || e.attackType === 'rightKick') ? 0.56 : 0.40;
        e.attackTimer = dur;
        e.attackCooldown = cfg.attackCooldown;
        e.hitResolved = false;
        if(e.comboCount > 0 && Math.random() < cfg.comboChance){
          e.comboCount++;
        } else {
          e.comboCount = 1;
        }
        if(e.comboCount > cfg.comboMax) e.comboCount = 1;
        if(e.comboCount > 1){
          e.attackCooldown = cfg.attackCooldown * 0.5;
        }
      }
    }

    if(e.attackTimer > 0){
      const total = (e.attackType === 'leftKick' || e.attackType === 'rightKick') ? 0.56 : 0.40;
      const pp = 1 - e.attackTimer / total;
      e.attackTimer -= dt;
      if(!e.hitResolved && pp >= 0.45){
        e.hitResolved = true;
        if(e.attackType === 'push'){
          this.resolveEnemyPush();
        } else {
          this.resolveEnemyHit();
        }
      }
      if(e.attackTimer <= 0){
        e.attackTimer = 0;
        e.attackType = 'none';
      }
    }
  },

  startSlide(e){
    const p = TBOX.Player;
    const dx = p.x - e.group.position.x;
    const dz = p.z - e.group.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    e.sliding = true;
    e.slideTimer = 0;
    e.slideDir.set(dx / dist, 0, dz / dist);
    TBOX.Audio.playWhoosh();
  },

  resolveEnemyPush(){
    const e = TBOX.Action.enemy;
    const p = TBOX.Player;
    if(!e || !e.alive || !p || !p.alive || p.dead) return;

    const dx = p.x - e.group.position.x;
    const dz = p.z - e.group.position.z;
    const dist = Math.hypot(dx, dz);
    if(dist > TBOX.DATA.ENEMY.attackRange + 0.6) return;

    if(p.holdingBlock){
      TBOX.Audio.playClash && TBOX.Audio.playClash();
      TBOX.UI.flashClash && TBOX.UI.flashClash();
      return;
    }

    if(TBOX.PlayerKnockdown && TBOX.PlayerKnockdown.knockDown){
      TBOX.PlayerKnockdown.knockDown(e.group.position.x, e.group.position.z);
    }

    TBOX.Audio.playHit();
    TBOX.UI.flashHit(0.5);
    TBOX.Engine.triggerShake(0.35, 0.2);
  },

  /* ★ 第三阶段：命中增加 hitStop */
  resolveEnemyHit(){
    const e = TBOX.Action.enemy;
    const p = TBOX.Player;
    if(!e || !e.alive || !p || !p.alive || p.dead) return;

    const dx = p.x - e.group.position.x;
    const dz = p.z - e.group.position.z;
    const dist = Math.hypot(dx, dz);
    if(dist > TBOX.DATA.ENEMY.attackRange + 0.4) return;

    if(TBOX.DATA.ENEMY.noAttackOnStair && TBOX.Engine.isPlayerOnStair()) return;

    const targetAngle = Math.atan2(dx, dz);
    const facingDiff = e.group.rotation.y - targetAngle;
    const normalized = Math.atan2(Math.sin(facingDiff), Math.cos(facingDiff));
    const facingDot = Math.cos(normalized);
    if(facingDot < TBOX.DATA.ENEMY.attackFacingDot) return;

    let dmg = TBOX.DATA.ENEMY.damage;

    if(p.holdingBlock){
      const B = TBOX.DATA.BLOCK;
      if(dmg >= 10) dmg = Math.max(B.minDamage, dmg - B.doubleDigitReduce);
      else dmg = Math.max(B.minDamage, dmg - B.singleDigitReduce);
      TBOX.Audio.playClash && TBOX.Audio.playClash();
      TBOX.UI.flashClash && TBOX.UI.flashClash();
    }

    p.hp -= dmg;

    const cy = Math.cos(TBOX.Engine.camState.yaw);
    const sy = Math.sin(TBOX.Engine.camState.yaw);
    const fwdX = -sy, fwdZ = -cy;
    const rgtX = cy, rgtZ = -sy;
    const toEnemyX = -dx / (dist || 1);
    const toEnemyZ = -dz / (dist || 1);
    const dotFwd = fwdX * toEnemyX + fwdZ * toEnemyZ;
    const dotRgt = rgtX * toEnemyX + rgtZ * toEnemyZ;
    let dir = -1;
    if(Math.abs(dotFwd) > Math.abs(dotRgt)) dir = dotFwd > 0 ? 1 : -1;
    else dir = dotRgt > 0 ? 2 : -2;
    p.lastHitDir = dir;

    /* ★ 第三阶段：玩家受击 hitStop（更强一点） */
    p.hitStop = Math.max(p.hitStop, dmg * 0.02);

    TBOX.UI.flashHit(0.6);
    TBOX.Engine.triggerHitShake(dmg);
    TBOX.Audio.playHit();
    TBOX.Audio.playHurt && TBOX.Audio.playHurt();

    if(p.hp <= 0){
      p.hp = 0;

      if(TBOX.UI.addKillFeed){
        TBOX.UI.addKillFeed(
          TBOX.DATA.ENEMY.name || 'Enemy',
          TBOX.DATA.CHAR && TBOX.DATA.CHAR.name ? TBOX.DATA.CHAR.name : 'Player'
        );
      }

      if(typeof window.killPlayer === 'function') window.killPlayer(dir);
      else { p.dead = true; p.alive = false; if(TBOX.UI.showDeathScreen) TBOX.UI.showDeathScreen(); }
    }
  },

  respawnEnemy(e){
    e.alive = true;
    e.hp = e.maxHp;
    e.group.rotation.x = 0;
    e.group.rotation.z = 0;
    e.group.visible = true;
    e.group.position.set(-4, 0, -8);
    e.attackTimer = 0;
    e.attackCooldown = 0;
    e.attackType = 'none';
    e.hitResolved = false;
    e.deadTimer = 0;
    e.sliding = false;
    e.dodging = false;
    e.climbing = false;
    e.speedFactor = 0;
    e.runPhase = 0;
    e.aiState = 'idle';
    e.comboCount = 0;
    e.chainSlide = 0;
    e.knockedDown = false;
    e.knockPhase = 'none';
    e.knockTimer = 0;
    e.vx = 0; e.vz = 0;
    e.blocking = false;
    e.blockTimer = 0;
    e.blockCooldown = 0;
    e.pushCooldown = 0;
  },

  resolveAttackHit(){
    const enemy = TBOX.Action.enemy;
    const dummy = TBOX.Action.dummy;
    const p = TBOX.Player;
    const cam = TBOX.Engine.camera;
    if(!p || !cam) return;

    if(p.attackType === 'push'){
      this._resolvePush(p, cam);
      return;
    }

    if(enemy && enemy.alive && enemy.group){
      if(this._tryHit(enemy, cam, p)) return;
    }
    if(dummy && dummy.alive && dummy.group){
      this._tryHit(dummy, cam, p);
    }
  },

  _resolvePush(p, cam){
    const PD = TBOX.DATA.PUSH;
    const SP = TBOX.DATA.SPRINT_ATK;

    const yaw = TBOX.Engine.camState.yaw;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    const isSprint = p.sprinting && p.speedFactor > 0.5;
    const force = isSprint ? SP.pushForce : PD.force;

    const e = TBOX.Action.enemy;
    if(e && e.alive && !e.knockedDown){
      const dx = e.group.position.x - p.x;
      const dz = e.group.position.z - p.z;
      const dist = Math.hypot(dx, dz);
      if(dist < PD.range){
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        const dot = fwdX * nx + fwdZ * nz;
        if(dot > PD.dotThreshold){
          this.knockDownEnemy(e, p.x, p.z, force);
          TBOX.UI.showHitMarker();
          TBOX.UI.flashHit(0.5);
          TBOX.Engine.triggerShake(0.3, 0.15);
          TBOX.Audio.playHit();
          p.hitStop = 0.04;
          return true;
        }
      }
    }

    const d = TBOX.Action.dummy;
    if(d && d.alive){
      const dx = d.group.position.x - p.x;
      const dz = d.group.position.z - p.z;
      const dist = Math.hypot(dx, dz);
      if(dist < PD.range){
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        const dot = fwdX * nx + fwdZ * nz;
        if(dot > PD.dotThreshold){
          TBOX.UI.showHitMarker();
          TBOX.Audio.playHit();
          return true;
        }
      }
    }
    return false;
  },

  _tryHit(target, cam, p){
    const px = cam.position.x, pz = cam.position.z;
    const dx = px - target.group.position.x;
    const dz = pz - target.group.position.z;
    const dist = Math.hypot(dx, dz);
    if(dist > TBOX.DATA.ATTACK_RANGE + target.radius) return false;

    const yaw = TBOX.Engine.camState.yaw;
    const camFwdX = -Math.sin(yaw);
    const camFwdZ = -Math.cos(yaw);

    const toX = target.group.position.x - px;
    const toZ = target.group.position.z - pz;
    const tl = Math.hypot(toX, toZ);
    if(tl < 0.0001) return false;
    const nToX = toX / tl;
    const nToZ = toZ / tl;

    const dot = camFwdX * nToX + camFwdZ * nToZ;
    const AO = TBOX.DATA.ATTACK_ORIENT;
    if(dot < AO.dotThreshold) return false;

    const type = p.attackType;
    let dmg = TBOX.DATA.ATK_DMG[type] || 1;

    const isKick = (type === 'leftKick' || type === 'rightKick' || type === 'sprintKick');
    if(p.sprintKick && isKick){
      dmg *= TBOX.DATA.SPRINT_ATK.kickMul;
    }
    if(p.sprintKick) dmg *= 2;

    if(target === TBOX.Action.enemy && target.blocking){
      const B = TBOX.DATA.BLOCK;
      if(dmg >= 10) dmg = Math.max(B.minDamage, dmg - B.doubleDigitReduce);
      else dmg = Math.max(B.minDamage, dmg - B.singleDigitReduce);
      TBOX.Audio.playClash && TBOX.Audio.playClash();
      TBOX.UI.flashClash && TBOX.UI.flashClash();
    }

    target.hp -= dmg;
    const kill = target.hp <= 0;

    const hitPos = new THREE.Vector3(target.group.position.x, 1.1, target.group.position.z);
    TBOX.UI.spawnDamageNumber(hitPos, dmg, cam, kill);
    TBOX.UI.spawnArmorBreak(hitPos, cam);
    TBOX.UI.showHitMarker();
    TBOX.UI.hitCrosshair(kill);
    TBOX.UI.flashHit(Math.min(0.9, 0.3 + dmg * 0.15));
    this.spawnFragments(hitPos, Math.min(12, dmg * 3), 4 + dmg, 0xffffff);
    TBOX.Engine.triggerShake(dmg * 0.06, dmg * 0.05);
    TBOX.Audio.playHit();
    if(kill) TBOX.Audio.playKill();

    if(p.sprintKick && isKick && target === TBOX.Action.enemy && target.alive){
      this.knockDownEnemy(target, p.x, p.z, TBOX.DATA.SPRINT_ATK.kickKnockBack);
    }

    /* ★ 第三阶段：玩家攻击命中 hitStop 加强 */
    p.hitStop = Math.max(p.hitStop, dmg * 0.025);
    p.combo += 1;
    p.comboTimer = 1.5;

    if(kill){
      if(target === TBOX.Action.enemy){
        target.alive = false;
        target.deadTimer = 0;
        target.respawnAt = performance.now() + TBOX.DATA.ENEMY.respawnTime * 1000;

        if(TBOX.UI.addKillFeed){
          TBOX.UI.addKillFeed(
            TBOX.DATA.CHAR && TBOX.DATA.CHAR.name ? TBOX.DATA.CHAR.name : 'Player',
            TBOX.DATA.ENEMY.name || 'Enemy'
          );
        }
      } else {
        TBOX.Action.destroyDummy();
      }
    }
    return true;
  },

  update(dt, now, rawDt){
    this.updateFragments(rawDt);
    this.updateDummy(now, rawDt);
  }
};