/* ============================================================
 * ai.js · 碎片 + dummy + 命中系统
 * V1.1.0 · 加 spawnHitIcon 调用 + tbox_dmgStyle 4 选 1
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

  resolveAttackHit(){
    const dummy = TBOX.Action.dummy;
    const p = TBOX.Player;
    const cam = TBOX.Engine.camera;
    if(!p || !cam) return;

    if(p.attackType === 'push'){
      this._resolvePush(p, cam);
      return;
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
    const px = p.x, pz = p.z;
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

    target.hp -= dmg;
    const kill = target.hp <= 0;

    const hitPos = new THREE.Vector3(target.group.position.x, 1.1, target.group.position.z);

    /* ★ 伤害数字 / 图标 / 都显示 / 关 */
    const dmgStyle = TBOX.Save.get('tbox_dmgStyle', 'number');
    if(dmgStyle === 'number' || dmgStyle === 'both'){
      TBOX.UI.spawnDamageNumber(hitPos, dmg, cam, kill);
    }
    if(dmgStyle === 'icon' || dmgStyle === 'both'){
      if(TBOX.UI.spawnHitIcon) TBOX.UI.spawnHitIcon(hitPos, cam, kill);
    }

    TBOX.UI.spawnArmorBreak(hitPos, cam);
    TBOX.UI.showHitMarker();
    TBOX.UI.hitCrosshair(kill);
    TBOX.UI.flashHit(Math.min(0.9, 0.3 + dmg * 0.15));
    this.spawnFragments(hitPos, Math.min(12, dmg * 3), 4 + dmg, 0xffffff);
    TBOX.Engine.triggerShake(dmg * 0.06, dmg * 0.05);
    TBOX.Audio.playHit();
    if(kill) TBOX.Audio.playKill();

    p.hitStop = Math.max(p.hitStop, dmg * 0.025);
    p.combo += 1;
    p.comboTimer = 1.5;

    if(kill){
      TBOX.Action.destroyDummy();
    }
    return true;
  },

  update(dt, now, rawDt){
    this.updateFragments(rawDt);
    this.updateDummy(now, rawDt);
  }
};