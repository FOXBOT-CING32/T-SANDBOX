/* ============================================================
 * action.js · 动作系统
 * V1.0.0 · 第四阶段：角色构建交给 CharBuilder
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Action = {
  character: null,
  dummy: null,
  enemy: null,
  corpses: [],

  /* ============================================================
   * 构建主角（★ 委托给 CharBuilder）
   * ============================================================ */
  buildCharacter(){
    if(!TBOX.CharBuilder){
      console.warn('[TBOX.Action] CharBuilder 未加载，使用旧版构建');
      return this._buildCharacterLegacy();
    }

    const cfg = TBOX.Save.getChar();
    const ch = TBOX.CharBuilder.build(cfg);

    /* 存储到 TBOX.Action 与 TBOX.Engine */
    this.character = ch;
    TBOX.Engine.character = ch;
    TBOX.Engine.scene.add(ch.root);

    /* 应用全身尺寸 */
    TBOX.Utils.applyBodyScale(ch, cfg);

    return ch;
  },

  /* 重建（配置变化时调用） */
  rebuildCharacter(){
    if(this.character && this.character.root){
      TBOX.Engine.scene.remove(this.character.root);
    }
    this.character = null;
    TBOX.Engine.character = null;
    return this.buildCharacter();
  },

  /* 应用角色配置（挂件 + 尺寸），配置变化时调用 */
  applyCharConfig(ch, cc){
    if(!ch || !cc) return;
    if(TBOX.CharBuilder && TBOX.CharBuilder.applyAccessories){
      TBOX.CharBuilder.applyAccessories(ch, cc);
    }
    TBOX.Utils.applyBodyScale(ch, cc);
  },

  /* ============================================================
   * 兼容旧版构建（如果 CharBuilder 没加载）
   * ============================================================ */
  _buildCharacterLegacy(){
    const C = TBOX.DATA.COLOR;
    const D = TBOX.DATA;
    const root = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: C.skin, roughness: .75 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: C.shirt, roughness: .8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: C.pants, roughness: .85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: C.shoe, roughness: .9 });
    const headMat = new THREE.MeshStandardMaterial({
      color: C.skin, roughness: .75,
      transparent: true, opacity: 0.0, depthWrite: false
    });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), headMat);
    head.position.y = 1.56; root.add(head);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), skinMat);
    neck.position.y = 1.43; root.add(neck);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.40, 0.18), shirtMat);
    torso.position.y = 1.18; root.add(torso);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), pantsMat);
    hips.position.y = 0.90; root.add(hips);

    function makeArm(side){
      const arm = new THREE.Group();
      arm.position.set(side * D.ARM_SHOULDER_X, D.ARM_SHOULDER_Y, D.ARM_SHOULDER_Z);
      arm.rotation.x = -0.05;
      arm.rotation.z = side * D.ARM_BASE_Z_ROT;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), shirtMat);
      upper.position.y = -0.11; arm.add(upper);
      const fore = new THREE.Group();
      fore.position.y = -0.22;
      fore.rotation.x = -0.10;
      const foreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.09), skinMat);
      foreMesh.position.y = -0.10; fore.add(foreMesh);
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), skinMat);
      fist.position.set(0, -0.24, 0); fore.add(fist);
      arm.add(fore);
      return { group: arm, fore, fist };
    }
    const armL = makeArm(-1), armR = makeArm(1);
    root.add(armL.group, armR.group);

    function makeLeg(side){
      const leg = new THREE.Group();
      leg.position.set(side * 0.08, 0.82, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.14), pantsMat);
      thigh.position.y = -0.17; leg.add(thigh);
      const shin = new THREE.Group();
      shin.position.y = -0.34;
      const sm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.13), pantsMat);
      sm.position.y = -0.18; shin.add(sm);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.26), shoeMat);
      foot.position.set(0, -0.44, 0.04);
      shin.add(foot);
      leg.add(shin);
      return { group: leg, shin, foot };
    }
    const legL = makeLeg(-1), legR = makeLeg(1);
    root.add(legL.group, legR.group);

    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    root.traverse(o => {
      if(o.isMesh && o.visible){ o.castShadow = shadowOn; o.receiveShadow = shadowOn; }
    });

    const ch = {
      root, head, neck, torso, hips,
      armL: armL.group, armR: armR.group,
      foreL: armL.fore, foreR: armR.fore,
      fistL: armL.fist, fistR: armR.fist,
      legL: legL.group, legR: legR.group,
      shinL: legL.shin, shinR: legR.shin,
      footL: legL.foot, footR: legR.foot,
      accessories: []
    };
    TBOX.Engine.scene.add(root);
    this.character = ch;
    TBOX.Engine.character = ch;
    return ch;
  },

  /* ============================================================
   * 靶子
   * ============================================================ */
  buildDummy(){
    const C = TBOX.DATA.COLOR;
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: C.dummy, roughness: .7, metalness: .05 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), white);
    head.position.y = 1.56; g.add(head);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), white);
    neck.position.y = 1.43; g.add(neck);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.40, 0.18), white);
    torso.position.y = 1.18; g.add(torso);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), white);
    hips.position.y = 0.90; g.add(hips);

    for(const side of [-1, 1]){
      const arm = new THREE.Group();
      arm.position.set(side * TBOX.DATA.ARM_SHOULDER_X, TBOX.DATA.ARM_SHOULDER_Y, TBOX.DATA.ARM_SHOULDER_Z);
      arm.rotation.x = -0.05;
      arm.rotation.z = side * TBOX.DATA.ARM_BASE_Z_ROT;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), white);
      upper.position.y = -0.11; arm.add(upper);
      const fore = new THREE.Group();
      fore.position.y = -0.22; fore.rotation.x = -0.10;
      const foreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.09), white);
      foreMesh.position.y = -0.10; fore.add(foreMesh);
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), white);
      fist.position.set(0, -0.24, 0); fore.add(fist);
      arm.add(fore);
      g.add(arm);
    }
    for(const side of [-1, 1]){
      const leg = new THREE.Group();
      leg.position.set(side * 0.08, 0.82, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.14), white);
      thigh.position.y = -0.17; leg.add(thigh);
      const shin = new THREE.Group();
      shin.position.y = -0.34;
      const sm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.13), white);
      sm.position.y = -0.18; shin.add(sm);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.26), white);
      foot.position.set(0, -0.44, 0.04);
      shin.add(foot);
      leg.add(shin);
      g.add(leg);
    }

    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    g.traverse(o => { if(o.isMesh){ o.castShadow = shadowOn; o.receiveShadow = shadowOn; } });

    const dummyPos = new THREE.Vector3(0, 0, -6);
    g.position.copy(dummyPos);
    TBOX.Engine.scene.add(g);

    const dummy = {
      group: g, hp: TBOX.DATA.TARGET_HP, alive: true,
      respawnAt: 0, spawnAnim: 0, pos: dummyPos, radius: 0.6
    };
    this.dummy = dummy;
    TBOX.Engine.dummy = dummy;
    return dummy;
  },

  /* ============================================================
   * 敌人
   * ============================================================ */
  buildEnemy(){
    const D = TBOX.DATA;
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0xff6666, roughness: .7, metalness: .05 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), red);
    head.position.y = 1.56; g.add(head);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.09), red);
    neck.position.y = 1.43; g.add(neck);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.40, 0.18), red);
    torso.position.y = 1.18; g.add(torso);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), red);
    hips.position.y = 0.90; g.add(hips);

    const arms = [];
    for(const side of [-1, 1]){
      const arm = new THREE.Group();
      arm.position.set(side * D.ARM_SHOULDER_X, D.ARM_SHOULDER_Y, D.ARM_SHOULDER_Z);
      arm.rotation.x = -0.05;
      arm.rotation.z = side * D.ARM_BASE_Z_ROT;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), red);
      upper.position.y = -0.11; arm.add(upper);
      const fore = new THREE.Group();
      fore.position.y = -0.22; fore.rotation.x = -0.10;
      const foreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.09), red);
      foreMesh.position.y = -0.10; fore.add(foreMesh);
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), red);
      fist.position.set(0, -0.24, 0); fore.add(fist);
      arm.add(fore);
      g.add(arm);
      arms.push({ group: arm, fore, fist });
    }

    const legs = [];
    for(const side of [-1, 1]){
      const leg = new THREE.Group();
      leg.position.set(side * 0.08, 0.82, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.14), red);
      thigh.position.y = -0.17; leg.add(thigh);
      const shin = new THREE.Group();
      shin.position.y = -0.34;
      const sm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.13), red);
      sm.position.y = -0.18; shin.add(sm);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.26), red);
      foot.position.set(0, -0.44, 0.04);
      shin.add(foot);
      leg.add(shin);
      g.add(leg);
      legs.push({ group: leg, shin, foot });
    }

    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    g.traverse(o => { if(o.isMesh){ o.castShadow = shadowOn; o.receiveShadow = shadowOn; } });

    const enemyPos = new THREE.Vector3(-4, 0, -8);
    g.position.copy(enemyPos);
    TBOX.Engine.scene.add(g);

    const enemy = {
      group: g,
      hp: TBOX.DATA.ENEMY.hp,
      maxHp: TBOX.DATA.ENEMY.maxHp,
      alive: true,
      pos: enemyPos,
      radius: 0.6,
      arms, legs,
      attackTimer: 0, attackCooldown: 0, attackType: 'none',
      hitResolved: false, movePhase: 0, facing: 0, deadTimer: 0,
      aiState: 'idle', aiTimer: 0, moveTimer: 0,
      dodging: false, dodgeTimer: 0, dodgeDir: 0,
      sliding: false, slideTimer: 0,
      slideDir: new THREE.Vector3(0,0,-1),
      chainSlide: 0, crouching: false, sprinting: false,
      runPhase: 0, speedFactor: 0,
      strafeDir: 1, strafeTimer: 0,
      comboCount: 0, comboQueued: false,
      climbing: false, climbTimer: 0, climbTarget: null,
      climbStartX: 0, climbStartY: 0, climbStartZ: 0,
      knockedDown: false, knockTimer: 0, knockDir: 0, knockPhase: 'none',
      vx: 0, vz: 0,
      blocking: false, blockTimer: 0, blockCooldown: 0
    };
    this.enemy = enemy;
    TBOX.Engine.enemy = enemy;
    return enemy;
  },

  /* ============================================================
   * 尸体
   * ============================================================ */
  createCorpse(){
    if(!this.character) return;
    const src = this.character.root;
    const corpse = {
      group: src,
      x: src.position.x, y: src.position.y, z: src.position.z,
      vx: 0, vy: 0, vz: 0,
      rx: src.rotation.x, ry: src.rotation.y, rz: src.rotation.z,
      vrx: 0, vry: 0, vrz: 0,
      fallDir: TBOX.Player.deathDir || 0,
      fallTimer: 0, bounceCount: 0, alive: true, life: 10.0
    };
    this.corpses.push(corpse);
    TBOX.Corpse = { list: this.corpses };
  },

  clearCorpse(){
    for(const c of this.corpses){
      if(c.group && c.group !== this.character.root){
        TBOX.Engine.scene.remove(c.group);
      }
    }
    this.corpses = [];
    TBOX.Corpse = { list: [] };
  },

  updateCorpse(dt){
    const G = TBOX.DATA.GRAVITY;
    for(const c of this.corpses){
      if(!c.alive) continue;
      if(c.fallTimer < 1.0){
        c.fallTimer += dt * 2.5;
        const q = Math.min(1, c.fallTimer);
        const dir = c.fallDir;
        if(dir === 1) c.rx = q * (Math.PI / 2);
        else if(dir === -1) c.rx = -q * (Math.PI / 2);
        else if(dir === 2) c.rz = q * (Math.PI / 2);
        else if(dir === -2) c.rz = -q * (Math.PI / 2);
        else c.rx = q * (Math.PI / 2);
      }
      c.vy += G * dt;
      c.y += c.vy * dt;
      const groundY = TBOX.Engine.resolvePlayerGround({ x: c.x, y: c.y, z: c.z });
      if(c.y < groundY){
        c.y = groundY;
        if(c.bounceCount < 2 && Math.abs(c.vy) > 2.0){
          c.vy = -c.vy * 0.35;
          c.bounceCount++;
          TBOX.Audio.playLand && TBOX.Audio.playLand();
        } else {
          c.vy = 0;
          c.vx *= (1 - dt * 4);
          c.vz *= (1 - dt * 4);
        }
      }
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      c.group.position.set(c.x, c.y, c.z);
      c.group.rotation.set(c.rx, c.ry, c.rz);
      c.life -= dt;
      if(c.life < 0) c.alive = false;
    }
  },

  pushCorpse(corpse, dx, dz, force){
    corpse.vx += dx * force;
    corpse.vz += dz * force;
  },

  hitCorpse(corpse, dir, dmg){
    corpse.vx += dir.x * dmg * 0.5;
    corpse.vz += dir.z * dmg * 0.5;
    corpse.vy += 2.0;
  },

  rebuildDummy(){
    if(this.dummy && this.dummy.group){
      TBOX.Engine.scene.remove(this.dummy.group);
    }
    this.buildDummy();
  },

  destroyDummy(){
    const d = this.dummy;
    if(!d || !d.alive) return;
    d.alive = false;
    d.hp = 0;
    d.respawnAt = performance.now() + 3000;
    d.spawnAnim = 0;
    if(d.group) d.group.visible = false;
  },

  /* ============================================================
   * 攻击姿态
   * ============================================================ */
  getAttackPose(type, p){
    const U = TBOX.Utils;
    const ARM_BASE_X = -0.05;
    const FOREARM_BASE_X = -0.10;

    const out = {
      armLX: ARM_BASE_X, armLY: 0, armLZ: 0, foreLX: FOREARM_BASE_X,
      armRX: ARM_BASE_X, armRY: 0, armRZ: 0, foreRX: FOREARM_BASE_X,
      bodyTwist: 0, bodyLean: 0, fistScale: 1
    };

    let strike = 0;
    if(p < 0.20) strike = U.easeOutCubic(p / 0.20) * 0.1;
    else if(p < 0.55) strike = U.easeOutQuint((p - 0.20) / 0.35);
    else strike = 1;

    switch(type){
      case 'jab': {
        out.armLX = U.lerp(ARM_BASE_X, -1.75, strike);
        out.foreLX = U.lerp(FOREARM_BASE_X, -0.10, strike);
        out.bodyTwist = -strike * 0.08;
        out.fistScale = 1 - strike * 0.10;
        break;
      }
      case 'cross': {
        out.armRX = U.lerp(ARM_BASE_X, -1.80, strike);
        out.foreRX = U.lerp(FOREARM_BASE_X, -0.10, strike);
        out.bodyTwist = strike * 0.10;
        out.fistScale = 1 - strike * 0.10;
        break;
      }
      case 'hookL': {
        out.armLX = U.lerp(ARM_BASE_X, -0.95, strike);
        out.armLY = U.lerp(0, 1.15, strike);
        out.foreLX = U.lerp(FOREARM_BASE_X, -1.50, strike);
        out.bodyTwist = -strike * 0.40;
        out.fistScale = 1 - strike * 0.12;
        break;
      }
      case 'hookR': {
        out.armRX = U.lerp(ARM_BASE_X, -0.95, strike);
        out.armRY = U.lerp(0, -1.15, strike);
        out.foreRX = U.lerp(FOREARM_BASE_X, -1.50, strike);
        out.bodyTwist = strike * 0.40;
        out.fistScale = 1 - strike * 0.12;
        break;
      }
      case 'hammer': {
        out.armRX = U.lerp(ARM_BASE_X, 0.35, 1 - strike);
        out.armRX = U.lerp(out.armRX, -1.45, strike);
        out.foreRX = U.lerp(FOREARM_BASE_X, -1.80, strike);
        out.bodyLean = strike * 0.18;
        out.fistScale = 1 - strike * 0.15;
        break;
      }
      case 'palm': {
        out.armLX = U.lerp(ARM_BASE_X, -1.50, strike);
        out.foreLX = U.lerp(FOREARM_BASE_X, 0.00, strike);
        out.bodyLean = strike * 0.08;
        break;
      }
      case 'elbowL': {
        out.armLX = U.lerp(ARM_BASE_X, -1.30, strike);
        out.armLY = U.lerp(0, 0.80, strike);
        out.armLZ = U.lerp(0, 0.45, strike);
        out.foreLX = U.lerp(FOREARM_BASE_X, -2.50, strike);
        out.bodyTwist = -strike * 0.32;
        break;
      }
      case 'elbowR': {
        out.armRX = U.lerp(ARM_BASE_X, -1.30, strike);
        out.armRY = U.lerp(0, -0.80, strike);
        out.armRZ = U.lerp(0, -0.45, strike);
        out.foreRX = U.lerp(FOREARM_BASE_X, -2.50, strike);
        out.bodyTwist = strike * 0.32;
        break;
      }
      case 'push': {
        if(strike < 0.5){
          const q = strike * 2;
          out.armLX = U.lerp(ARM_BASE_X, -1.10, q);
          out.armRX = U.lerp(ARM_BASE_X, -1.10, q);
          out.foreLX = U.lerp(FOREARM_BASE_X, -1.60, q);
          out.foreRX = U.lerp(FOREARM_BASE_X, -1.60, q);
          out.armLY = U.lerp(0, 0.20, q);
          out.armRY = U.lerp(0, -0.20, q);
          out.bodyLean = U.lerp(0, -0.10, q);
        } else {
          const q = (strike - 0.5) * 2;
          out.armLX = U.lerp(-1.10, -1.55, q);
          out.armRX = U.lerp(-1.10, -1.55, q);
          out.foreLX = U.lerp(-1.60, -0.10, q);
          out.foreRX = U.lerp(-1.60, -0.10, q);
          out.armLY = U.lerp(0.20, 0.10, q);
          out.armRY = U.lerp(-0.20, -0.10, q);
          out.bodyLean = U.lerp(-0.10, 0.15, q);
          out.fistScale = U.lerp(1, 1.15, q);
        }
        break;
      }
    }
    return out;
  },

  clampArm(x){ return TBOX.Utils.clamp(x, -2.6, 0.8); },
  clampFore(x){ return TBOX.Utils.clamp(x, -2.6, 0.1); },
  clampLeg(x){ return TBOX.Utils.clamp(x, -1.8, 0.6); },
  clampShin(x){ return TBOX.Utils.clamp(x, 0, 2.4); },

  applyStance(ch, ca){
    const S = TBOX.DATA.STANCE;
    ch.legL.rotation.y = S.legSpreadY;
    ch.legR.rotation.y = -S.legSpreadY;
    if(ch.footL) ch.footL.rotation.set(0, 0, 0);
    if(ch.footR) ch.footR.rotation.set(0, 0, 0);
  },

  /* ============================================================
   * 主角动作（保留原逻辑，末尾加 applyBodyScale）
   * ============================================================ */
  updatePose(dt, now, p){
    if(!this.character) return;
    const ch = this.character;
    const U = TBOX.Utils;
    const D = TBOX.DATA;

    let moveState = 'idle';
    const spd = p.speedFactor;
    if(spd > 0.08){
      if(p.crouching) moveState = 'crouchWalk';
      else if(p.sprinting && spd > 0.3) moveState = 'sprint';
      else if(spd > 0.75) moveState = 'run';
      else moveState = 'walk';
    } else {
      if(p.crouching) moveState = 'crouchIdle';
    }
    if(p.climbing) moveState = 'climb';
    if(p.dead) moveState = 'dead';
    if(p.holdingBlock) moveState = 'block';
    if(p.dodging) moveState = 'dodge';
    p.moveState = moveState;
    if(TBOX.Save.get('tbox_showStance', '1') === '1'){
      TBOX.UI.updateStance(moveState);
    }

    const ca = U.lerp(p.crouchAmt, p.crouching ? 1 : 0, Math.min(1, dt * 10));
    p.crouchAmt = ca;

    const phase = p.runPhase;
    const sf = p.speedFactor;

    const legAmpBase = 0.95;
    const legSwing = Math.sin(phase) * legAmpBase * sf;
    const legSwingAlt = Math.sin(phase + Math.PI) * legAmpBase * sf;

    let legLX = legSwing;
    let legRX = legSwingAlt;
    let shinLX = Math.max(0, -legSwing) * (1.0 + sf * 0.4);
    let shinRX = Math.max(0, -legSwingAlt) * (1.0 + sf * 0.4);

    const elbowBend = 1.15;
    let armLX = -0.15 - legSwing * 1.0;
    let armRX = -0.15 - legSwingAlt * 1.0;
    let foreLX = -0.10 - elbowBend;
    let foreRX = -0.10 - elbowBend;
    let armLY = 0, armRY = 0, armLZ = 0, armRZ = 0;
    let fistScaleL = 1, fistScaleR = 1;

    let bodyLeanX = 0;
    let bodyTwistY = 0;
    let bodyDrop = 0;
    let torsoBendX = 0;
    let headBendX = 0;

    if(moveState === 'walk' || moveState === 'run' || moveState === 'sprint'){
      const lean = moveState === 'sprint' ? 0.10 : (moveState === 'run' ? 0.06 : 0.03);
      bodyLeanX += lean * sf;
      if(moveState === 'sprint'){
        armLX = -0.20 - legSwing * 1.2;
        armRX = -0.20 - legSwingAlt * 1.2;
      }
    }

    if(moveState === 'idle' && !p.inspecting && !p.attackTimer && !p.holdingBlock && !p.dead){
      const breath = Math.sin(now * 0.0012) * 0.04;
      armLX = -0.12 + breath;
      armRX = -0.12 + breath * 0.8;
      foreLX = -0.10 - 0.15 - Math.sin(now * 0.0012 + 0.5) * 0.02;
      foreRX = -0.10 - 0.15 - Math.sin(now * 0.0012 + 0.7) * 0.02;
      armLY = 0.02;
      armRY = -0.02;
    }

    if(ca > 0.001){
      const hip = D.CROUCH_HIP - D.CROUCH_KNEE * 0.9;
      legLX = U.lerp(legLX, hip, ca);
      legRX = U.lerp(legRX, hip, ca);
      shinLX = U.lerp(shinLX, D.CROUCH_KNEE, ca);
      shinRX = U.lerp(shinRX, D.CROUCH_KNEE, ca);
      bodyDrop = D.CROUCH_DROP * ca;
      armLX = U.lerp(armLX, -0.20, ca);
      armRX = U.lerp(armRX, -0.20, ca);
      foreLX = U.lerp(foreLX, -0.35, ca);
      foreRX = U.lerp(foreRX, -0.35, ca);
      armLY = U.lerp(armLY, 0.06, ca);
      armRY = U.lerp(armRY, -0.06, ca);
      if(moveState === 'crouchWalk'){
        legLX += Math.sin(phase) * 0.18 * sf;
        legRX += Math.sin(phase + Math.PI) * 0.18 * sf;
        shinLX = Math.max(0, shinLX + Math.sin(phase) * 0.12 * sf);
        shinRX = Math.max(0, shinRX + Math.sin(phase + Math.PI) * 0.12 * sf);
      }
    }

    if(p.jumpPhase === 'crouch'){
      const k = Math.sin((p.jumpTimer / 0.10) * Math.PI);
      legLX = -0.75 * k; legRX = -0.75 * k;
      shinLX = 1.1 * k; shinRX = 1.1 * k;
      bodyDrop += 0.20 * k;
      armLX = U.lerp(armLX, -0.80, k);
      armRX = U.lerp(armRX, -0.80, k);
      foreLX = U.lerp(foreLX, -1.20, k);
      foreRX = U.lerp(foreRX, -1.20, k);
    } else if(p.jumpPhase === 'air'){
      const k = U.easeOutCubic(Math.min(1, p.jumpTimer / 0.35));
      const keepCrouch = p.crouchJump ? ca : 0;
      legLX = U.lerp(legLX, U.lerp(-0.85, -1.20, keepCrouch), k);
      legRX = U.lerp(legRX, U.lerp(0.45, -1.20, keepCrouch), k);
      shinLX = U.lerp(shinLX, U.lerp(1.3, 1.75, keepCrouch), k);
      shinRX = U.lerp(shinRX, U.lerp(0.7, 1.75, keepCrouch), k);
      bodyLeanX += -0.06 * k;
      armLX = U.lerp(armLX, -1.10, k);
      armRX = U.lerp(armRX, -1.10, k);
      foreLX = U.lerp(foreLX, -0.80, k);
      foreRX = U.lerp(foreRX, -0.80, k);
    } else if(p.jumpPhase === 'land'){
      const k = 1 - U.easeOutCubic(p.jumpTimer / 0.14);
      legLX = -0.55 * k; legRX = -0.55 * k;
      shinLX = 0.85 * k; shinRX = 0.85 * k;
      bodyDrop += 0.14 * k;
      armLX = U.lerp(armLX, 0.30, k);
      armRX = U.lerp(armRX, 0.30, k);
    }

    if(p.bigJump && !p.onGround){
      const bigK = U.easeOutCubic(Math.min(1, p.jumpTimer / 0.4));
      legLX = -0.90 * bigK - 0.20 * (1 - bigK);
      legRX = 0.90 * bigK + 0.20 * (1 - bigK);
      shinLX = 1.30 * bigK;
      shinRX = 1.30 * bigK;
      armLX = -1.30 * bigK - 0.20 * (1 - bigK);
      armRX = -1.30 * bigK - 0.20 * (1 - bigK);
      armLY = 0.40 * bigK;
      armRY = -0.40 * bigK;
      foreLX = -0.60 * bigK;
      foreRX = -0.60 * bigK;
    }

    if(p.holdingBlock && !p.dead){
      armLX = -1.30; armRX = -1.30;
      foreLX = -1.90; foreRX = -1.90;
      armLY = 0.30; armRY = -0.30;
      bodyLeanX += 0.10;
    }

    if(p.dodging){
      p.dodgeTimer += dt;
      if(p.dodgeTimer >= D.DODGE.sideDur){ p.dodging = false; p.dodgeTimer = 0; }
      else {
        const q = Math.sin(Math.min(1, p.dodgeTimer / D.DODGE.sideDur) * Math.PI);
        if(p.dodgeType === 'back'){
          bodyLeanX -= D.DODGE.backLean * q;
          legLX = -0.60 * q; legRX = -0.30 * q;
          shinLX = 1.10 * q; shinRX = 0.60 * q;
          armLX = -1.40 * q; armRX = -1.40 * q;
          foreLX = -1.80 * q; foreRX = -1.80 * q;
          bodyDrop = Math.max(bodyDrop, 0.10 * q);
        } else {
          const dir = p.dodgeDir || 1;
          bodyTwistY += dir * 0.30 * q;
          bodyDrop = Math.max(bodyDrop, 0.15 * q);
          if(dir > 0){
            legLX = -0.30 * q; legRX = -0.80 * q;
            shinLX = 0.50 * q; shinRX = 1.40 * q;
          } else {
            legRX = -0.30 * q; legLX = -0.80 * q;
            shinRX = 0.50 * q; shinLX = 1.40 * q;
          }
          armLX = -0.60 * q; armRX = -0.60 * q;
          foreLX = -0.90 * q; foreRX = -0.90 * q;
        }
      }
    }

    let camDipTarget = 0;
    if(p.attackTimer > 0){
      const total = TBOX.DATA.ATK_DUR[p.attackType] || 0.30;
      const pp = 1 - p.attackTimer / total;
      const type = p.attackType;

      if(['jab','cross','hookL','hookR','hammer','palm','elbowL','elbowR','push'].includes(type)){
        const ap = this.getAttackPose(type, pp);
        armLX = ap.armLX; armLY = ap.armLY; armLZ = ap.armLZ; foreLX = ap.foreLX;
        armRX = ap.armRX; armRY = ap.armRY; armRZ = ap.armRZ; foreRX = ap.foreRX;
        bodyTwistY = ap.bodyTwist;
        bodyLeanX = ap.bodyLean;
        if(type === 'jab' || type === 'hookL' || type === 'palm' || type === 'push') fistScaleL = ap.fistScale;
        if(type === 'cross' || type === 'hookR' || type === 'hammer' || type === 'push') fistScaleR = ap.fistScale;
      }
      else if(type === 'leftKick' || type === 'sprintKick'){
        const isSprint = p.sprintKick;
        const mul = isSprint ? 1.25 : 1.0;
        let hip, knee;
        if(pp < 0.30){ const q = U.easeOutQuint(pp / 0.30); hip = 1.35 * q * mul; knee = 2.2 * q * mul; }
        else if(pp < 0.55){ const q = U.easeOutQuint((pp - 0.30) / 0.25); hip = 1.35 * mul; knee = (2.2 - 2.1 * q) * mul; }
        else { const q = U.easeInQuart((pp - 0.55) / 0.45); hip = 1.35 * mul * (1 - q); knee = 0.1 * (1 - q); }
        legLX = -hip; shinLX = knee;
        legRX = legRX * 0.3; shinRX = shinRX * 0.3;
        bodyLeanX += 0.10 * hip;
        camDipTarget = 0.10 * hip;
      }
      else if(type === 'rightKick'){
        const isSprint = p.sprintKick;
        const mul = isSprint ? 1.25 : 1.0;
        let hip, knee;
        if(pp < 0.30){ const q = U.easeOutQuint(pp / 0.30); hip = 1.35 * q * mul; knee = 2.2 * q * mul; }
        else if(pp < 0.55){ const q = U.easeOutQuint((pp - 0.30) / 0.25); hip = 1.35 * mul; knee = (2.2 - 2.1 * q) * mul; }
        else { const q = U.easeInQuart((pp - 0.55) / 0.45); hip = 1.35 * mul * (1 - q); knee = 0.1 * (1 - q); }
        legRX = -hip; shinRX = knee;
        legLX = legLX * 0.3; shinLX = shinLX * 0.3;
        bodyLeanX += 0.10 * hip;
        camDipTarget = 0.10 * hip;
      }
      else if(type === 'knee'){
        let hip, knee;
        if(pp < 0.30){ const q = U.easeOutQuint(pp / 0.30); hip = 1.5 * q; knee = 2.2 * q; }
        else if(pp < 0.58){ const q = U.easeOutQuint((pp - 0.30) / 0.28); hip = 1.5; knee = 2.2 - 0.4 * q; }
        else { const q = U.easeInQuart((pp - 0.58) / 0.42); hip = 1.5 * (1 - q); knee = 1.8 * (1 - q); }
        if(p.kneeSide === 1){ legLX = -hip; shinLX = knee; }
        else { legRX = -hip; shinRX = knee; }
        camDipTarget = 0.10 * hip;
      }
    }

    if(p.kneeing){
      p.kneeTimer += dt;
      const KD = 0.5;
      if(p.kneeTimer >= KD){ p.kneeing = false; p.kneeTimer = 0; }
      else {
        const q = Math.sin(Math.min(1, p.kneeTimer / KD) * Math.PI);
        if(p.kneeSide === 1){ legLX = -1.6 * q; shinLX = 2.2 * q; legRX = -0.3 * q; }
        else { legRX = -1.6 * q; shinRX = 2.2 * q; legLX = -0.3 * q; }
        bodyDrop = Math.max(bodyDrop, 0.15 * q);
      }
    }

    p.camKick = U.lerp(p.camKick, camDipTarget, Math.min(1, dt * 12));

    if(p.climbing){
      p.climbTimer += dt;
      const cp = Math.min(1, p.climbTimer / D.CLIMB_DUR);
      if(p.climbHang){
        const a = 0.5 + Math.sin(now * 0.003) * 0.05;
        armLX = -2.4 * a; armRX = -2.4 * a;
        foreLX = -0.30 * a; foreRX = -0.30 * a;
        armLY = 0.30 * a; armRY = -0.30 * a;
        legLX = -1.0 * 0.6; legRX = -1.0 * 0.6;
        shinLX = 1.8 * 0.6; shinRX = 1.8 * 0.6;
      } else {
        const q = U.easeInOutCubic(cp);
        p.x = U.lerp(p.climbStartX, p.climbEndX, q);
        p.z = U.lerp(p.climbStartZ, p.climbEndZ, q);
        p.y = U.lerp(p.climbStartY, p.climbEndY, q);
        const armPhase = cp * Math.PI * 2;
        const lUp = Math.sin(armPhase);
        const rUp = Math.sin(armPhase + Math.PI);
        armLX = -2.2 - 0.3 * lUp;
        armRX = -2.2 - 0.3 * rUp;
        foreLX = -0.4 - 0.2 * lUp;
        foreRX = -0.4 - 0.2 * rUp;
        armLY = 0.25; armRY = -0.25;
        legLX = -1.2 + 0.4 * rUp;
        legRX = -1.2 + 0.4 * lUp;
        shinLX = 1.8 - 0.3 * rUp;
        shinRX = 1.8 - 0.3 * lUp;
        if(p.climbTimer >= D.CLIMB_DUR){
          p.climbing = false;
          p.climbTimer = 0;
          p.onGround = true;
          p.vy = 0;
          p.y = p.climbEndY;
        }
      }
    }

    if(p.inspecting){
      p.inspectTimer += dt;
      const t = p.inspectTimer;
      if(t >= TBOX.DATA.INSPECT_DUR){
        p.inspecting = false;
        p.inspectTimer = 0;
        p.inspectCamZ = 0; p.inspectCamY = 0;
        p.inspectFistScale = 1;
      } else {
        const pp = t / TBOX.DATA.INSPECT_DUR;
        let armLXv, armRXv, foreLXv, foreRXv;
        let armLy = 0, armRy = 0;
        let camZ = 0, camY = 0;
        let fs = 1;
        const baseArmL = armLX;
        const baseArmR = armRX;
        const baseForeL = foreLX;
        const baseForeR = foreRX;

        if(pp < 0.30){
          const q = U.easeOutQuint(pp / 0.30);
          armLXv = U.lerp(baseArmL, -1.20, q);
          armRXv = U.lerp(baseArmR, -1.25, q);
          foreLXv = U.lerp(baseForeL, -1.10, q);
          foreRXv = U.lerp(baseForeR, -1.15, q);
          armLy = U.lerp(0, 0.20, q); armRy = U.lerp(0, -0.20, q);
          camZ = 0.08 * q; camY = 0.04 * q;
        } else if(pp < 0.55){
          const q = U.easeOutCubic((pp - 0.30) / 0.25);
          armLXv = U.lerp(-1.20, -1.30, q);
          armRXv = U.lerp(-1.25, -1.35, q);
          foreLXv = U.lerp(-1.10, -1.25, q);
          foreRXv = U.lerp(-1.15, -1.30, q);
          armLy = U.lerp(0.20, 0.35, q); armRy = U.lerp(-0.20, -0.35, q);
          camZ = 0.08 + 0.02 * q; camY = 0.04;
        } else if(pp < 0.75){
          const q = U.easeOutQuint((pp - 0.55) / 0.20);
          armLXv = U.lerp(-1.30, -1.15, q);
          armRXv = U.lerp(-1.35, -1.15, q);
          foreLXv = U.lerp(-1.25, -1.70, q);
          foreRXv = U.lerp(-1.30, -1.70, q);
          armLy = U.lerp(0.35, 0.15, q); armRy = U.lerp(-0.35, -0.15, q);
          camZ = 0.10; camY = 0.05;
          fs = 1 - q * 0.20;
        } else {
          const q = U.easeInOutCubic((pp - 0.75) / 0.25);
          armLXv = U.lerp(-1.15, baseArmL, q);
          armRXv = U.lerp(-1.15, baseArmR, q);
          foreLXv = U.lerp(-1.70, baseForeL, q);
          foreRXv = U.lerp(-1.70, baseForeR, q);
          armLy = U.lerp(0.15, 0, q); armRy = U.lerp(-0.15, 0, q);
          camZ = U.lerp(0.10, 0, q); camY = U.lerp(0.05, 0, q);
          fs = 0.80 + q * 0.20;
        }

        if(!p.attackTimer){
          armLX = armLXv; armRX = armRXv;
          foreLX = foreLXv; foreRX = foreRXv;
          armLY = armLy; armRY = armRy;
        }
        p.inspectCamZ = camZ; p.inspectCamY = camY;
        p.inspectFistScale = fs;
        fistScaleL = fs; fistScaleR = fs;
      }
    }

    if(p.sliding){
      p.slideTimer += dt;
      if(p.slideTimer >= D.SLIDE_DUR){
        p.sliding = false;
        p.slideTimer = 0;
        p.slideVis = 0;
        TBOX.Engine.setViewRoll(0);
      } else {
        const pp = p.slideTimer / D.SLIDE_DUR;
        let q;
        if(pp < 0.15) q = U.easeOutCubic(pp / 0.15);
        else if(pp < 0.70) q = 1;
        else q = 1 - U.easeInCubic((pp - 0.70) / 0.30);
        const side = p.slideSide || 1;
        const SS = D.SLIDE_SIDE;
        if(side > 0){
          legRX = -1.75 * q; shinRX = 0.05 * q;
          legLX = -1.20 * q; shinLX = 1.90 * q;
        } else {
          legLX = -1.75 * q; shinLX = 0.05 * q;
          legRX = -1.20 * q; shinRX = 1.90 * q;
        }
        armRX = -1.50 * q; foreRX = -1.60 * q;
        armRY = side > 0 ? -0.30 * q : -0.10 * q;
        armLX = -0.30 * q; foreLX = -1.20 * q;
        armLY = side > 0 ? 0.20 * q : 0.40 * q;
        bodyLeanX += 0.20 * q;
        bodyTwistY += side * SS.twistAmount * q;
        bodyDrop += SS.bodyDrop * q;
        TBOX.Engine.setViewRoll(-SS.camRoll * side * q);
        ch.legL.rotation.y = side * SS.legSpreadY * q;
        ch.legR.rotation.y = -side * SS.legSpreadY * q;
      }
    } else {
      ch.legL.rotation.y = 0;
      ch.legR.rotation.y = 0;
    }

    if(p.dead){
      p.deathTimer += dt;
      const t = p.deathTimer;
      const dir = p.deathDir;
      const dur = D.DEATH.fallDur;
      const q = Math.min(1, t / dur);
      const wasCrouching = p.crouchAmt > 0.3;

      if(dir === 1) ch.root.rotation.x = U.easeInCubic(q) * (Math.PI / 2);
      else if(dir === -1) ch.root.rotation.x = -U.easeInCubic(q) * (Math.PI / 2);
      else if(dir === 2) ch.root.rotation.z = U.easeInCubic(q) * (Math.PI / 2);
      else if(dir === -2) ch.root.rotation.z = -U.easeInCubic(q) * (Math.PI / 2);
      else ch.root.rotation.x = U.easeInCubic(q) * (Math.PI / 2);

      armLX = -0.5 * q; armRX = -0.5 * q;
      foreLX = -0.1 * q; foreRX = -0.1 * q;
      armLY = 0.7 * q; armRY = -0.7 * q;
      const legBend = wasCrouching ? 0.8 : 0.3;
      legLX = -legBend * q; legRX = -legBend * q;
      shinLX = (wasCrouching ? 1.4 : 0.5) * q;
      shinRX = (wasCrouching ? 1.4 : 0.5) * q;
      bodyDrop += q * 0.45;

      if(t > dur + 1.5 && ch.head && ch.head.material){
        ch.head.material.opacity = Math.max(0, ch.head.material.opacity - dt * 0.5);
      }
    } else {
      ch.root.rotation.x = U.lerp(ch.root.rotation.x, 0, Math.min(1, dt * 8));
      ch.root.rotation.z = U.lerp(ch.root.rotation.z, 0, Math.min(1, dt * 8));
      if(ch.head && ch.head.material){
        if(TBOX.Engine.camState.mode === 'fps'){
          ch.head.material.opacity = 0;
        }
      }
    }

    legLX = this.clampLeg(legLX); legRX = this.clampLeg(legRX);
    shinLX = this.clampShin(shinLX); shinRX = this.clampShin(shinRX);
    armLX = this.clampArm(armLX); armRX = this.clampArm(armRX);
    foreLX = this.clampFore(foreLX); foreRX = this.clampFore(foreRX);

    const k = Math.min(1, dt * 18);
    ch.legL.rotation.x = U.lerp(ch.legL.rotation.x, legLX, k);
    ch.legR.rotation.x = U.lerp(ch.legR.rotation.x, legRX, k);
    ch.shinL.rotation.x = U.lerp(ch.shinL.rotation.x, shinLX, k);
    ch.shinR.rotation.x = U.lerp(ch.shinR.rotation.x, shinRX, k);
    ch.armL.rotation.x = U.lerp(ch.armL.rotation.x, armLX, k);
    ch.armR.rotation.x = U.lerp(ch.armR.rotation.x, armRX, k);
    ch.foreL.rotation.x = U.lerp(ch.foreL.rotation.x, foreLX, k);
    ch.foreR.rotation.x = U.lerp(ch.foreR.rotation.x, foreRX, k);
    ch.armL.rotation.y = U.lerp(ch.armL.rotation.y, armLY, k);
    ch.armR.rotation.y = U.lerp(ch.armR.rotation.y, armRY, k);
    ch.armL.rotation.z = U.lerp(ch.armL.rotation.z, armLZ, k);
    ch.armR.rotation.z = U.lerp(ch.armR.rotation.z, armRZ, k);

    if(ch.torso) ch.torso.rotation.x = U.lerp(ch.torso.rotation.x, torsoBendX, Math.min(1, dt * 12));
    if(ch.head) ch.head.rotation.x = U.lerp(ch.head.rotation.x, headBendX, Math.min(1, dt * 12));
    if(ch.neck) ch.neck.rotation.x = U.lerp(ch.neck.rotation.x, headBendX * 0.5, Math.min(1, dt * 12));

    if(ch.fistL && ch.fistL.scale){
      ch.fistL.scale.setScalar(U.lerp(ch.fistL.scale.x, fistScaleL, k));
      ch.fistR.scale.setScalar(U.lerp(ch.fistR.scale.x, fistScaleR, k));
    }

    this.applyStance(ch, ca);

    const armBaseY = D.ARM_SHOULDER_Y - ca * 0.15;
    ch.armL.position.y = armBaseY;
    ch.armR.position.y = armBaseY;
    const armBaseZ = D.ARM_SHOULDER_Z + ca * 0.06;
    ch.armL.position.z = armBaseZ;
    ch.armR.position.z = armBaseZ;

    p.bodyLeanX = U.lerp(p.bodyLeanX, bodyLeanX, Math.min(1, dt * 14));
    p.bodyRollZ = 0;
    p.bodyTwistY = U.lerp(p.bodyTwistY, bodyTwistY * 0.3, Math.min(1, dt * 16));

    if(!p.dead){
      ch.root.rotation.x = p.bodyLeanX;
      ch.root.rotation.z = 0;
      ch.root.rotation.y = TBOX.Engine.camState.yaw + Math.PI + p.bodyTwistY;
    }

    const slideY = p.sliding ? 0.35 * Math.sin(Math.min(1, p.slideTimer / D.SLIDE_DUR) * Math.PI) : 0;

    let finalY = p.y - bodyDrop - slideY;
    const groundY = TBOX.Engine.resolvePlayerGround ? TBOX.Engine.resolvePlayerGround(p) : 0;
    if(finalY < groundY) finalY = groundY;
    if(ca > 0.5 && finalY > groundY + 0.02) finalY = groundY;

    ch.root.position.set(p.x, finalY, p.z);

    /* ★ 应用全身尺寸缩放（每帧轻微调整，确保尺寸设置生效） */
    /* 只在尺寸变化时应用，避免每帧重复计算 —— 用缓存标记 */
    if(ch._lastSize !== undefined){
      const cc = TBOX.Save.getChar();
      const sizeKey = [
        cc.sizeHeight, cc.sizeHeadRatio, cc.sizeShoulder,
        cc.sizeArmLength, cc.sizeHandSize, cc.sizeLegLength,
        cc.sizeFootSize, cc.sizeBodyThick
      ].join(',');
      if(ch._lastSize !== sizeKey){
        TBOX.Utils.applyBodyScale(ch, cc);
        ch._lastSize = sizeKey;
      }
    } else {
      ch._lastSize = '';
    }
  },

  /* ============================================================
   * 敌方人偶动画
   * ============================================================ */
  updateEnemyPose(dt, now){
    const e = this.enemy;
    if(!e || !e.group) return;
    const U = TBOX.Utils;
    const D = TBOX.DATA;

    if(!e.alive){
      e.deadTimer += dt;
      const q = Math.min(1, e.deadTimer / 0.6);
      e.group.rotation.x = U.easeInCubic(q) * (Math.PI / 2);
      for(let i = 0; i < e.arms.length; i++){
        e.arms[i].group.rotation.x = U.lerp(e.arms[i].group.rotation.x, -0.4, Math.min(1, dt * 6));
        e.arms[i].group.rotation.z = U.lerp(e.arms[i].group.rotation.z, (i === 0 ? 1 : -1) * 0.4, Math.min(1, dt * 6));
      }
      return;
    }

    if(e.knockedDown){
      e.knockTimer += dt;
      const KD = D.KNOCKDOWN;
      if(e.knockPhase === 'falling'){
        const q = Math.min(1, e.knockTimer / KD.fallDur);
        const dir = e.knockDir;
        if(dir === 1) e.group.rotation.x = U.easeInCubic(q) * (Math.PI / 2);
        else if(dir === -1) e.group.rotation.x = -U.easeInCubic(q) * (Math.PI / 2);
        else if(dir === 2) e.group.rotation.z = U.easeInCubic(q) * (Math.PI / 2);
        else if(dir === -2) e.group.rotation.z = -U.easeInCubic(q) * (Math.PI / 2);
        else e.group.rotation.x = U.easeInCubic(q) * (Math.PI / 2);
        e.group.position.x += e.vx * dt;
        e.group.position.z += e.vz * dt;
        e.vx *= (1 - dt * 3);
        e.vz *= (1 - dt * 3);
        if(e.knockTimer >= KD.fallDur){
          e.knockPhase = 'lying';
          e.knockTimer = 0;
        }
      } else if(e.knockPhase === 'lying'){
        if(e.knockTimer >= KD.lieDur){
          e.knockPhase = 'gettingUp';
          e.knockTimer = 0;
        }
      } else if(e.knockPhase === 'gettingUp'){
        const q = Math.min(1, e.knockTimer / KD.getUpDur);
        const startX = (e.knockDir === 1 ? Math.PI/2 : (e.knockDir === -1 ? -Math.PI/2 : 0));
        const startZ = (e.knockDir === 2 ? Math.PI/2 : (e.knockDir === -2 ? -Math.PI/2 : 0));
        e.group.rotation.x = U.lerp(startX, 0, U.easeInOutCubic(q));
        e.group.rotation.z = U.lerp(startZ, 0, U.easeInOutCubic(q));
        if(e.knockTimer >= KD.getUpDur){
          e.knockedDown = false;
          e.knockPhase = 'none';
          e.knockTimer = 0;
          e.group.rotation.set(0, e.group.rotation.y, 0);
        }
      }
      return;
    }

    e.legs[0].group.rotation.y = D.STANCE.legSpreadY;
    e.legs[1].group.rotation.y = -D.STANCE.legSpreadY;

    const px = TBOX.Player.x;
    const pz = TBOX.Player.z;
    const dx = px - e.group.position.x;
    const dz = pz - e.group.position.z;
    const angle = Math.atan2(dx, dz);
    e.group.rotation.y = U.lerpAngle(e.group.rotation.y, angle, Math.min(1, dt * 10));

    const phase = e.runPhase || 0;
    const sf = e.speedFactor || 0;
    const legSwing = Math.sin(phase) * 0.95 * sf;
    const legSwingAlt = Math.sin(phase + Math.PI) * 0.95 * sf;

    if(e.blocking){
      for(let i = 0; i < e.arms.length; i++){
        e.arms[i].group.rotation.x = U.lerp(e.arms[i].group.rotation.x, -1.30, Math.min(1, dt * 12));
        e.arms[i].fore.rotation.x = U.lerp(e.arms[i].fore.rotation.x, -1.90, Math.min(1, dt * 12));
      }
      e.legs[0].group.rotation.x = U.lerp(e.legs[0].group.rotation.x, legSwing, Math.min(1, dt * 14));
      e.legs[1].group.rotation.x = U.lerp(e.legs[1].group.rotation.x, legSwingAlt, Math.min(1, dt * 14));
      return;
    }

    if(e.attackTimer > 0){
      e.legs[0].group.rotation.x = U.lerp(e.legs[0].group.rotation.x, legSwing, Math.min(1, dt * 14));
      e.legs[1].group.rotation.x = U.lerp(e.legs[1].group.rotation.x, legSwingAlt, Math.min(1, dt * 14));

      const type = e.attackType;
      const total = (type === 'leftKick' || type === 'rightKick') ? 0.56 : 0.40;
      const pp = 1 - e.attackTimer / total;
      let amt;
      if(pp < 0.25) amt = U.easeOutQuint(pp / 0.25);
      else if(pp < 0.55) amt = 1;
      else amt = 1 - U.easeInQuart((pp - 0.55) / 0.45);
      amt = U.clamp(amt, 0, 1);

      if(type === 'jab'){
        e.arms[0].group.rotation.x = U.lerp(-0.05, -1.75, amt);
        e.arms[0].fore.rotation.x = U.lerp(-0.10, -0.10, amt);
      } else if(type === 'cross'){
        e.arms[1].group.rotation.x = U.lerp(-0.05, -1.80, amt);
        e.arms[1].fore.rotation.x = U.lerp(-0.10, -0.10, amt);
      } else if(type === 'hookL'){
        e.arms[0].group.rotation.x = U.lerp(-0.05, -0.95, amt);
        e.arms[0].group.rotation.y = U.lerp(0, 1.15, amt);
        e.arms[0].fore.rotation.x = U.lerp(-0.10, -1.50, amt);
      } else if(type === 'hookR'){
        e.arms[1].group.rotation.x = U.lerp(-0.05, -0.95, amt);
        e.arms[1].group.rotation.y = U.lerp(0, -1.15, amt);
        e.arms[1].fore.rotation.x = U.lerp(-0.10, -1.50, amt);
      } else if(type === 'hammer'){
        e.arms[1].group.rotation.x = U.lerp(-0.05, -1.45, amt);
        e.arms[1].fore.rotation.x = U.lerp(-0.10, -1.80, amt);
      } else if(type === 'palm'){
        e.arms[0].group.rotation.x = U.lerp(-0.05, -1.50, amt);
        e.arms[0].fore.rotation.x = U.lerp(-0.10, 0.00, amt);
      } else if(type === 'elbowL'){
        e.arms[0].group.rotation.x = U.lerp(-0.05, -1.30, amt);
        e.arms[0].fore.rotation.x = U.lerp(-0.10, -2.50, amt);
      } else if(type === 'elbowR'){
        e.arms[1].group.rotation.x = U.lerp(-0.05, -1.30, amt);
        e.arms[1].fore.rotation.x = U.lerp(-0.10, -2.50, amt);
      } else if(type === 'leftKick' || type === 'rightKick'){
        const i = type === 'leftKick' ? 0 : 1;
        e.legs[i].group.rotation.x = U.lerp(0, -1.6, amt);
        e.legs[i].shin.rotation.x = U.lerp(0, 0.1, amt);
        e.legs[1-i].group.rotation.x = U.lerp(0, -0.20, amt);
        e.legs[1-i].shin.rotation.x = U.lerp(0, 0.25, amt);
      }
    } else if(e.sliding){
      const pp = Math.min(1, e.slideTimer / D.SLIDE_DUR);
      let q;
      if(pp < 0.15) q = U.easeOutCubic(pp / 0.15);
      else if(pp < 0.70) q = 1;
      else q = 1 - U.easeInCubic((pp - 0.70) / 0.30);
      e.legs[1].group.rotation.x = -1.55 * q;
      e.legs[1].shin.rotation.x = 0.10 * q;
      e.legs[0].group.rotation.x = -1.20 * q;
      e.legs[0].shin.rotation.x = 1.80 * q;
      e.arms[0].group.rotation.x = -1.20 * q;
      e.arms[0].fore.rotation.x = -1.90 * q;
      e.arms[1].group.rotation.x = 0.20 * q;
    } else if(e.dodging){
      const pp = Math.min(1, e.dodgeTimer / D.DODGE.sideDur);
      const q = Math.sin(pp * Math.PI);
      e.group.position.y = q * 0.15;
      if(e.dodgeDir > 0){
        e.legs[0].group.rotation.x = -0.30 * q;
        e.legs[1].group.rotation.x = -0.80 * q;
      } else {
        e.legs[1].group.rotation.x = -0.30 * q;
        e.legs[0].group.rotation.x = -0.80 * q;
      }
    } else {
      const isMoving = sf > 0.05;
      const baseSwing = isMoving ? legSwing : 0;
      const baseSwingAlt = isMoving ? legSwingAlt : 0;

      e.legs[0].group.rotation.x = U.lerp(e.legs[0].group.rotation.x, baseSwing, Math.min(1, dt * 14));
      e.legs[1].group.rotation.x = U.lerp(e.legs[1].group.rotation.x, baseSwingAlt, Math.min(1, dt * 14));
      e.legs[0].shin.rotation.x = U.lerp(e.legs[0].shin.rotation.x, Math.max(0, -baseSwing) * 1.2, Math.min(1, dt * 14));
      e.legs[1].shin.rotation.x = U.lerp(e.legs[1].shin.rotation.x, Math.max(0, -baseSwingAlt) * 1.2, Math.min(1, dt * 14));

      const breath = Math.sin(now * 0.0012) * 0.04;
      const armSwing = legSwing * 1.0;
      const armSwingAlt = legSwingAlt * 1.0;
      e.arms[0].group.rotation.x = U.lerp(e.arms[0].group.rotation.x, -0.15 - armSwing + breath, Math.min(1, dt * 12));
      e.arms[1].group.rotation.x = U.lerp(e.arms[1].group.rotation.x, -0.15 - armSwingAlt + breath * 0.8, Math.min(1, dt * 12));
      e.arms[0].fore.rotation.x = U.lerp(e.arms[0].fore.rotation.x, -0.10 - 1.15, Math.min(1, dt * 10));
      e.arms[1].fore.rotation.x = U.lerp(e.arms[1].fore.rotation.x, -0.10 - 1.15, Math.min(1, dt * 10));
      e.arms[0].group.rotation.y = U.lerp(e.arms[0].group.rotation.y, 0.04, Math.min(1, dt * 6));
      e.arms[1].group.rotation.y = U.lerp(e.arms[1].group.rotation.y, -0.04, Math.min(1, dt * 6));
      e.group.rotation.x = U.lerp(e.group.rotation.x, isMoving ? 0.05 * sf : 0, Math.min(1, dt * 6));
    }
  }
};