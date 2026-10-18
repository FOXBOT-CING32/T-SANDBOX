/* ============================================================
 * ai.js · 碎片 + dummy + 命中系统
 * V5.1.0 · 彻底修复连音、打怪无伤害、动作不播
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
      m = new THREE.MeshStandardMaterial({ color: key, emissive: 0x222228, emissiveIntensity: .4, roughness: .5 });
      this.fragMatCache.set(key, m);
    }
    return m;
  },

  spawnFragments(pos, count, power, color){
    const mat = this.getFragMat(color);
    const Q = TBOX.Engine.Q || TBOX.DATA.QUALITY.mid;
    for(let i = 0; i < count; i++){
      const m = new THREE.Mesh(this.fragGeo, mat);
      m.position.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + (Math.random() - 0.5) * 0.6, pos.z + (Math.random() - 0.5) * 0.4);
      m.scale.setScalar(0.6 + Math.random() * 0.8);
      m.castShadow = false;
      TBOX.Engine.scene.add(m);
      this.fragments.push({ mesh: m, vx: (Math.random() - 0.5) * power, vy: Math.random() * power * 0.8 + 2.5, vz: (Math.random() - 0.5) * power - 1.5, rx: (Math.random() - 0.5) * 14, ry: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14, life: 1.4 + Math.random() * 0.8, landed: false });
    }
    while(this.fragments.length > Q.maxFrags){ const f = this.fragments.shift(); TBOX.Engine.scene.remove(f.mesh); }
  },

  updateFragments(dt){
    const G = TBOX.DATA.GRAVITY;
    for(let i = this.fragments.length - 1; i >= 0; i--){
      const f = this.fragments[i];
      f.vy += G * 0.55 * dt; f.mesh.position.x += f.vx * dt; f.mesh.position.y += f.vy * dt; f.mesh.position.z += f.vz * dt;
      f.mesh.rotation.x += f.rx * dt; f.mesh.rotation.y += f.ry * dt; f.mesh.rotation.z += f.rz * dt;
      if(f.mesh.position.y < 0.07){ f.mesh.position.y = 0.07; if(!f.landed){ f.landed = true; f.vy *= -0.3; f.vx *= 0.7; f.vz *= 0.7; } else { f.vy = 0; f.vx *= (1 - dt * 4); f.vz *= (1 - dt * 4); } }
      f.life -= dt;
      if(f.life < 0){ TBOX.Engine.scene.remove(f.mesh); this.fragments.splice(i, 1); } else if(f.life < 0.5) f.mesh.scale.multiplyScalar(1 - dt * 1.8);
    }
  },

  updateDummy(now, rawDt){
    const d = TBOX.Action.dummy;
    if(!d || !d.group) return;
    if(!d.alive && d.respawnAt && now >= d.respawnAt){
      d.group.visible = true; d.group.position.copy(d.pos); d.group.rotation.set(0, 0, 0); d.hp = TBOX.DATA.TARGET_HP; d.alive = true; d.spawnAnim = 1; d.flying = false; d.dying = false; d.flyVX = 0; d.flyVY = 0; d.flyVZ = 0; d.flyTimer = 0; d.flyDistance = 0;
      if(d.aabb){ d.aabb.x = d.pos.x; d.aabb.y = 0.9; d.aabb.z = d.pos.z; d.aabb.topY = 1.8; d.aabb.bottomY = 0; }
    }
    if(d.alive && d.spawnAnim > 0){ d.spawnAnim = Math.max(0, d.spawnAnim - rawDt * 3.5); const s = 1 - d.spawnAnim; d.group.scale.set(1, Math.max(0.02, s), 1); }
    if(d.alive && d.flying){
      const KF = TBOX.DATA.KICK_FLY; d.flyTimer += rawDt; d.flyVY += KF.gravity * rawDt;
      d.group.position.x += d.flyVX * rawDt; d.group.position.z += d.flyVZ * rawDt; d.group.position.y += d.flyVY * rawDt;
      d.flyVX *= (1 - rawDt * KF.friction); d.flyVZ *= (1 - rawDt * KF.friction);
      const gy = TBOX.Engine.resolvePlayerGround({ x: d.group.position.x, y: d.group.position.y, z: d.group.position.z });
      if(d.group.position.y <= gy + 0.01){ d.group.position.y = gy; d.flyVY = 0; d.flyVX *= 0.3; d.flyVZ *= 0.3; }
      d.group.rotation.x += rawDt * 6; d.group.rotation.z += rawDt * 4;
      const slowEnough = Math.hypot(d.flyVX, d.flyVZ) < 0.5 && d.flyVY === 0;
      if(slowEnough){ d.flying = false; d.flyVX = 0; d.flyVZ = 0; d.flyVY = 0; d.group.rotation.x = Math.PI / 2; d.dying = true; d.dyingTimer = 0.6; }
    }
    if(d.alive && d.dying){ d.dyingTimer -= rawDt; if(d.dyingTimer <= 0){ TBOX.Action.destroyDummy(); } }
    if(d.alive && d.aabb && d.group){ d.aabb.x = d.group.position.x; d.aabb.y = d.group.position.y + 0.9; d.aabb.z = d.group.position.z; d.aabb.topY = d.group.position.y + 1.8; d.aabb.bottomY = d.group.position.y; }
  },

  /* ★ 关键修复：确保击中只产生一次音效和伤害 */
  resolveAttackHit(){
    const dummy = TBOX.Action.dummy;
    const p = TBOX.Player;
    const cam = TBOX.Engine.camera;
    if(!p || !cam) return;

    this._pushProps(p, cam); // 推物体
    if(dummy && dummy.alive && dummy.group){ this._tryHit(dummy, cam, p); } // 打NPC
    if(p.attackType === 'push'){ this._resolvePush(p, cam); } // 推人
  },

  _pushProps(p, cam){
    const AP = TBOX.DATA.ATTACK_PUSH; if(!AP.enable) return;
    const props = TBOX.Engine.props; if(!props || !props.length) return;
    const yaw = TBOX.Engine.camState.yaw; const fwdX = -Math.sin(yaw); const fwdZ = -Math.cos(yaw);
    const type = p.attackType; const isKick = ['leftKick','rightKick','sprintKick','knee'].includes(type); const isPush = type === 'push'; const baseMul = isPush ? 1.5 : (isKick ? 1.0 : 0.5);
    for(const obj of props){
      if(!obj.mesh) continue;
      const dx = obj.mesh.position.x - p.x; const dz = obj.mesh.position.z - p.z; const dist = Math.hypot(dx, dz); if(dist > AP.range) continue;
      const nx = dx / (dist || 1); const nz = dz / (dist || 1); const dot = fwdX * nx + fwdZ * nz; if(dot < 0.3) continue;
      const objMass = obj.mass || 1; const massFalloff = Math.pow(Math.max(0.3, objMass), -AP.massFalloff); const force = AP.force * baseMul * massFalloff;
      obj.phy.vx += nx * force; obj.phy.vz += nz * force; obj.phy.vy += AP.upForce * baseMul * massFalloff; obj.phy.sleeping = false; obj.phy.sleepTimer = 0;
    }
  },

  _resolvePush(p, cam){
    const PD = TBOX.DATA.PUSH; const SP = TBOX.DATA.SPRINT_ATK;
    const yaw = TBOX.Engine.camState.yaw; const fwdX = -Math.sin(yaw); const fwdZ = -Math.cos(yaw);
    const isSprint = p.sprinting && p.speedFactor > 0.5; const force = isSprint ? SP.pushForce : PD.force;
    const d = TBOX.Action.dummy;
    if(d && d.alive){
      const dx = d.group.position.x - p.x; const dz = d.group.position.z - p.z; const dist = Math.hypot(dx, dz);
      if(dist < PD.range){
        const nx = dx / (dist || 1); const nz = dz / (dist || 1); const dot = fwdX * nx + fwdZ * nz;
        if(dot > PD.dotThreshold){
          TBOX.UI.showHitMarker(); TBOX.Audio.playHit();
          if(!d.flying){ d.flyVX = nx * force * 0.5; d.flyVZ = nz * force * 0.5; d.flyVY = 1.5; d.flying = true; d.flyTimer = 0; d.flyDistance = 0; }
          return true;
        }
      }
    }
    return false;
  },

  _getHitPart(target, hitY){
    const HP = TBOX.DATA.HIT_PART; const baseY = target.group.position.y; const relY = hitY - baseY;
    if(relY >= HP.headMinY && relY <= HP.headMaxY) return 'head';
    if(relY >= HP.armMinY && relY < HP.armMaxY) return 'arm';
    if(relY >= HP.bodyMinY && relY < HP.bodyMaxY) return 'body';
    if(relY < HP.legMaxY) return 'leg';
    return 'body';
  },

  _tryHit(target, cam, p){
    const px = p.x, pz = p.z; const dx = px - target.group.position.x; const dz = pz - target.group.position.z; const dist = Math.hypot(dx, dz);
    if(dist > TBOX.DATA.ATTACK_RANGE + target.radius) return false;

    const yaw = TBOX.Engine.camState.yaw; const camFwdX = -Math.sin(yaw); const camFwdZ = -Math.cos(yaw);
    const toX = target.group.position.x - px; const toZ = target.group.position.z - pz; const tl = Math.hypot(toX, toZ);
    if(tl < 0.0001) return false;
    const nToX = toX / tl; const nToZ = toZ / tl; const dot = camFwdX * nToX + camFwdZ * nToZ;
    const AO = TBOX.DATA.ATTACK_ORIENT;
    if(dot < AO.dotThreshold) return false;

    const type = p.attackType; let dmg = TBOX.DATA.ATK_DMG[type] || 1;
    const isKick = (type === 'leftKick' || type === 'rightKick' || type === 'sprintKick'); const isSprintKick = p.sprintKick && isKick;
    if(isSprintKick){ dmg *= TBOX.DATA.SPRINT_ATK.kickMul; }

    target.hp -= dmg; const kill = target.hp <= 0;
    const hitPos = new THREE.Vector3(target.group.position.x, 1.1, target.group.position.z);
    const hitY = 1.1; const part = this._getHitPart(target, hitY);
    
    let shouldFly = false;
    if(isSprintKick && TBOX.DATA.KICK_FLY.enable){ if(part === 'body' && dmg >= TBOX.DATA.KICK_FLY.minDmgForFly){ shouldFly = true; } }
    if(shouldFly && !target.flying){ target.flyVX = nToX * TBOX.DATA.KICK_FLY.flySpeed; target.flyVZ = nToZ * TBOX.DATA.KICK_FLY.flySpeed; target.flyVY = TBOX.DATA.KICK_FLY.flyUp; target.flying = true; target.flyTimer = 0; target.flyDistance = 0; target.flyMaxDist = TBOX.DATA.KICK_FLY.maxDistance; }

    if(TBOX.Save.get('tbox_showDmgNumber', '1') === '1'){ TBOX.UI.spawnDamageNumber(hitPos, dmg, cam, kill); }
    if(TBOX.Save.get('tbox_showDmgIcon', '1') === '1'){ if(TBOX.UI.spawnHitIcon) TBOX.UI.spawnHitIcon(hitPos, cam, kill); }
    TBOX.UI.spawnArmorBreak(hitPos, cam); TBOX.UI.showHitMarker(); TBOX.UI.hitCrosshair(kill); TBOX.UI.flashHit(Math.min(0.9, 0.3 + dmg * 0.15));
    this.spawnFragments(hitPos, Math.min(12, dmg * 3), 4 + dmg, 0xffffff);
    TBOX.Engine.triggerShake(dmg * 0.06, dmg * 0.05); TBOX.Audio.playHit(); if(kill) TBOX.Audio.playKill();

    p.hitStop = Math.max(p.hitStop, dmg * 0.025); p.combo += 1; p.comboTimer = 1.5;
    if(kill && !target.flying){ TBOX.Action.destroyDummy(); }
    return true;
  },

  update(dt, now, rawDt){
    this.updateFragments(rawDt);
    this.updateDummy(now, rawDt);
  }
};