/* ============================================================
 * engine.js · 游戏引擎系统
 * V1.0.0 · 第三阶段：设置全部生效 + 视角收敛 + NPC贴地 + hitStop
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Engine = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  sunLight: null,
  hemiLight: null,
  ground: null,
  groundMat: null,
  stairs: [],
  clock: 0,
  running: false,
  paused: false,
  lastTime: 0,
  shadowTick: 0,
  fpsAcc: 0,
  fpsFrames: 0,
  fpsValue: 60,

  Q: null,
  hdrEnabled: false,
  hdrTexture: null,
  envTexture: null,

  camState: {
    yaw: 0, pitch: 0,
    mode: 'fps',
    transition: 0,
    viewRoll: 0,
    shakeTime: 0, shakeMag: 0
  },

  swayTime: 0,
  swayX: 0, swayY: 0,
  runShakeX: 0, runShakeY: 0,

  vitals: {
    heart: 72, heartTarget: 72,
    lung: 16, lungTarget: 16,
    heartPhase: 0, lungPhase: 0,
    lastHeartbeat: 0, lastBreath: 0
  },

  hurtFx: {
    blinkPhase: 0, blinkTimer: 0,
    hitFrameOn: false, hitFrameTimer: 0,
    slowMoCurrent: 1.0
  },

  deathFx: {
    active: false,
    timer: 0,
    fadeLevel: 0,
    blinkLevel: 0,
    dizzyRoll: 0,
    dizzyTime: 0,
    camFollowHead: true
  },

  player: null,
  character: null,
  dummy: null,
  enemy: null,
  keys: {},
  isTouch: false,

  ambientWind: null,
  ambientBirds: null,

  /* ============================================================
   * 初始化
   * ============================================================ */
  init(){
    this.isTouch = TBOX.Utils.isTouch();

    this.scene = new THREE.Scene();
    const fogEnabled = TBOX.Save.get('tbox_fog', '1') === '1';
    this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
    if(fogEnabled) this.scene.fog = new THREE.Fog(TBOX.DATA.COLOR.sky, 120, 480);

    const fov = TBOX.Save.getNum('tbox_fov', 120);
    this.camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.05, 2000);

    const perf = TBOX.Utils.detectPerf();
    const quality = TBOX.Save.get('tbox_quality', 'auto');
    const finalQ = quality === 'auto' ? perf : quality;
    const Q = TBOX.DATA.QUALITY[finalQ] || TBOX.DATA.QUALITY.mid;
    this.Q = Q;

    const aa = TBOX.Save.get('tbox_aa', 'off');
    this.renderer = new THREE.WebGLRenderer({
      antialias: aa === 'high',
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(innerWidth, innerHeight);
    const resScale = TBOX.Save.getNum('tbox_resScale', 100) / 100;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio * resScale));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    this.renderer.shadowMap.enabled = shadowOn;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    document.getElementById('app').appendChild(this.renderer.domElement);

    if(!this.isTouch){
      this.controls = new PointerLockControls(this.camera, document.body);
      const sens = TBOX.Save.getNum('tbox_sens', 22);
      this.controls.pointerSpeed = sens / 10;
    }
    this.scene.add(this.camera);

    this.hemiLight = new THREE.HemisphereLight(0xcfe4ff, 0x5a6a4a, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2dc, 2.0);
    this.sunLight.position.set(24, 46, 18);
    this.sunLight.castShadow = shadowOn;
    this.sunLight.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 14;
    this.sunLight.shadow.camera.bottom = -14;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.sunLight.shadow.radius = 2;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.groundMat = new THREE.MeshStandardMaterial({
      color: TBOX.DATA.COLOR.ground, roughness: 1, metalness: 0
    });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = shadowOn;
    this.scene.add(this.ground);

    new THREE.TextureLoader().load(
      'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sparse_grass/sparse_grass_diff_1k.jpg',
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(320, 320);
        tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        this.groundMat.map = tex;
        this.groundMat.color.set(0xffffff);
        this.groundMat.needsUpdate = true;
      }
    );

    /* ★ HDR 环境贴图（默认关闭，由 tbox_hdr 控制） */
    if(TBOX.Save.get('tbox_hdr', '0') === '1'){
      this._loadHDR();
    } else {
      this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
    }

    /* 应用照明开关 */
    this._applyLighting(TBOX.Save.get('tbox_lighting', '0') === '1');

    this._buildStairs();
    this._bindInput();
    this._bindSettings();
    addEventListener('resize', () => this._onResize());
  },

  /* ★ HDR 加载 */
  _loadHDR(){
    new RGBELoader().load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_43d_clear_puresky_1k.hdr',
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.background = tex;
        this.scene.environment = tex;
        this.hdrTexture = tex;
        this.hdrEnabled = true;
      },
      undefined,
      () => {
        this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
        this.hdrEnabled = false;
      }
    );
  },

  /* ★ 照明开关 */
  _applyLighting(on){
    if(this.hemiLight) this.hemiLight.intensity = on ? 0.85 : 0.2;
    if(this.sunLight) this.sunLight.intensity = on ? 2.0 : 0.3;
  },

  _buildStairs(){
    const S = TBOX.DATA.STAIRS;
    const mat = new THREE.MeshStandardMaterial({
      color: TBOX.DATA.COLOR.stair, roughness: .85, metalness: .05
    });
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    for(let i = 0; i < S.count; i++){
      const h = S.height * (i + 1);
      const geo = new THREE.BoxGeometry(S.width, h, S.depth);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(S.baseX, h / 2, S.baseZ + i * S.depth);
      mesh.castShadow = shadowOn;
      mesh.receiveShadow = shadowOn;
      this.scene.add(mesh);
      this.stairs.push({
        mesh, x: S.baseX, z: S.baseZ + i * S.depth,
        topY: h, bottomY: 0,
        halfW: S.width / 2, halfD: S.depth / 2,
        index: i
      });
    }
  },

  _bindInput(){
    addEventListener('keydown', (e) => {
      if(e.repeat) return;
      this.keys[e.code] = true;
      TBOX.Events.emit('input:keydown', e);
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      TBOX.Events.emit('input:keyup', e);
    });

    let pcMouseLocked = false;
    document.addEventListener('pointerlockchange', () => {
      pcMouseLocked = document.pointerLockElement !== null;
    });
    document.addEventListener('mousemove', (e) => {
      if(!this.running || this.isTouch || !pcMouseLocked) return;
      if(this.paused) return;
      const sens = TBOX.Save.getNum('tbox_sens', 22);
      const s = 0.0022 * (sens / 22);
      const invertY = TBOX.Save.get('tbox_invertY', '0') === '1' ? -1 : 1;
      this.camState.yaw -= e.movementX * s;
      this.camState.pitch -= e.movementY * s * invertY;
      this.camState.pitch = TBOX.Utils.clamp(
        this.camState.pitch,
        TBOX.DATA.PITCH_MIN,
        TBOX.DATA.PITCH_MAX
      );
    });

    document.addEventListener('mousedown', (e) => {
      if(this.isTouch || !this.running || this.paused) return;
      if(e.button === 0){ e.preventDefault(); TBOX.Events.emit('input:lmb', true); }
      else if(e.button === 2){ e.preventDefault(); TBOX.Events.emit('input:rmb', true); }
    });
    document.addEventListener('mouseup', (e) => {
      if(e.button === 0) TBOX.Events.emit('input:lmb', false);
      else if(e.button === 2) TBOX.Events.emit('input:rmb', false);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  _bindSettings(){
    TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, (data) => {
      this._applySetting(data.key, data.value);
    });
  },

  _applySetting(key, value){
    switch(key){
      case 'tbox_fov':
        if(this.camera){
          this.camera.fov = Number(value);
          this.camera.updateProjectionMatrix();
        }
        break;
      case 'tbox_sens':
        if(this.controls) this.controls.pointerSpeed = Number(value) / 10;
        break;
      case 'tbox_resScale':
        if(this.renderer){
          const Q = this.Q || TBOX.DATA.QUALITY.mid;
          this.renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio * (Number(value) / 100)));
        }
        break;
      case 'tbox_shadow':
        if(this.renderer){
          const on = value === '1';
          this.renderer.shadowMap.enabled = on;
          if(this.sunLight) this.sunLight.castShadow = on;
          if(this.ground) this.ground.receiveShadow = on;
          this.stairs.forEach(s => { s.mesh.castShadow = on; s.mesh.receiveShadow = on; });
          if(this.character){
            this.character.root.traverse(o => {
              if(o.isMesh){ o.castShadow = on; o.receiveShadow = on; }
            });
          }
          if(this.dummy && this.dummy.group){
            this.dummy.group.traverse(o => {
              if(o.isMesh){ o.castShadow = on; o.receiveShadow = on; }
            });
          }
          if(this.enemy && this.enemy.group){
            this.enemy.group.traverse(o => {
              if(o.isMesh){ o.castShadow = on; o.receiveShadow = on; }
            });
          }
        }
        break;
      case 'tbox_fog':
        if(this.scene){
          if(value === '1') this.scene.fog = new THREE.Fog(TBOX.DATA.COLOR.sky, 120, 480);
          else this.scene.fog = null;
        }
        break;
      case 'tbox_vitals':
        if(TBOX.UI && TBOX.UI.els && TBOX.UI.els.vitalsHud){
          TBOX.UI.els.vitalsHud.style.display = value === '1' ? 'flex' : 'none';
        }
        break;

      /* ★ 第三阶段新增分支 */
      case 'tbox_lighting':
        this._applyLighting(value === '1');
        break;

      case 'tbox_bloom':
        if(this.renderer){
          this.renderer.domElement.style.filter = value === '1' ? 'brightness(1.08) contrast(1.05)' : '';
        }
        break;

      case 'tbox_aa':
        if(this.renderer){
          /* 无法动态切换 antialias，需要重建 renderer。这里给出提示 */
          console.warn('AA 运行时切换需刷新页面');
        }
        break;

      case 'tbox_shadowQ': {
        if(!this.sunLight) break;
        const sizes = { low: 512, mid: 1024, high: 2048, ultra: 4096 };
        const s = sizes[value] || 1024;
        this.sunLight.shadow.mapSize.set(s, s);
        if(this.sunLight.shadow.map){
          this.sunLight.shadow.map.dispose();
          this.sunLight.shadow.map = null;
        }
        break;
      }

      case 'tbox_hdr':
        if(value === '1'){
          if(!this.hdrEnabled) this._loadHDR();
        } else {
          if(this.hdrTexture){
            this.hdrTexture.dispose();
            this.hdrTexture = null;
          }
          this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
          this.scene.environment = null;
          this.hdrEnabled = false;
        }
        break;
    }
  },

  _onResize(){
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  },

  /* ============================================================
   * 物理：AABB 碰撞
   * ============================================================ */
  resolvePlayerCollision(p){
    if(this.dummy && this.dummy.alive && this.dummy.group){
      const dx = p.x - this.dummy.group.position.x;
      const dz = p.z - this.dummy.group.position.z;
      const dist = Math.hypot(dx, dz);
      const PUSH = TBOX.DATA.PLAYER_RADIUS + this.dummy.radius;
      if(dist < PUSH && dist > 0.0001){
        p.x += (dx / dist) * (PUSH - dist);
        p.z += (dz / dist) * (PUSH - dist);
        this.triggerShake(0.15, 0.08);
      }
    }
    if(this.enemy && this.enemy.alive && this.enemy.group){
      const dx = p.x - this.enemy.group.position.x;
      const dz = p.z - this.enemy.group.position.z;
      const dist = Math.hypot(dx, dz);
      const PUSH = TBOX.DATA.PLAYER_RADIUS + this.enemy.radius;
      if(dist < PUSH && dist > 0.0001){
        p.x += (dx / dist) * (PUSH - dist);
        p.z += (dz / dist) * (PUSH - dist);
      }
    }
    if(TBOX.Corpse && TBOX.Corpse.list){
      for(const c of TBOX.Corpse.list){
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const dist = Math.hypot(dx, dz);
        const R = 0.6 + TBOX.DATA.PLAYER_RADIUS;
        if(dist < R && dist > 0.0001){
          p.x += (dx / dist) * (R - dist);
          p.z += (dz / dist) * (R - dist);
        }
      }
    }
    if(!p.climbing && !p.climbHanging){
      for(const s of this.stairs){
        const dx = p.x - s.x;
        const dz = p.z - s.z;
        const halfW = s.halfW + TBOX.DATA.PLAYER_RADIUS;
        const halfD = s.halfD + TBOX.DATA.PLAYER_RADIUS;
        if(p.y >= s.topY - 0.10) continue;
        if(p.y > s.topY) continue;
        if(Math.abs(dx) < halfW && Math.abs(dz) < halfD){
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          if(overlapX < overlapZ){
            p.x += (dx > 0 ? overlapX : -overlapX);
          } else {
            p.z += (dz > 0 ? overlapZ : -overlapZ);
          }
        }
      }
    }
  },

  /* ★ 第三阶段：NPC 贴地修复（NPC 也走 groundY） */
  resolveEnemyCollision(e){
    if(!e || !e.group) return;
    if(!TBOX.DATA.ENEMY.collideWithStairs) return;
    const ex = e.group.position.x;
    const ez = e.group.position.z;
    const ey = e.group.position.y;
    const R = TBOX.DATA.ENEMY.collisionRadius;

    for(const s of this.stairs){
      const dx = ex - s.x;
      const dz = ez - s.z;
      const halfW = s.halfW + R;
      const halfD = s.halfD + R;
      if(ey >= s.topY - 0.10) continue;
      if(Math.abs(dx) < halfW && Math.abs(dz) < halfD){
        const overlapX = halfW - Math.abs(dx);
        const overlapZ = halfD - Math.abs(dz);
        if(overlapX < overlapZ){
          e.group.position.x += (dx > 0 ? overlapX : -overlapX);
        } else {
          e.group.position.z += (dz > 0 ? overlapZ : -overlapZ);
        }
      }
    }

    /* ★ NPC 贴地 */
    const groundY = this.resolvePlayerGround({
      x: e.group.position.x,
      z: e.group.position.z,
      y: e.group.position.y
    });
    if(e.group.position.y < groundY){
      e.group.position.y = groundY;
    }
  },

  resolvePlayerGround(p){
    let groundY = 0;
    let onStair = false;
    for(const s of this.stairs){
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      if(Math.abs(dx) < s.halfW && Math.abs(dz) < s.halfD){
        if(s.topY <= p.y + 0.45 && s.topY > groundY){
          groundY = s.topY;
          onStair = true;
        }
      }
    }
    p.onStair = onStair;
    return groundY;
  },

  isPlayerOnStair(){
    const p = TBOX.Player;
    if(!p) return false;
    if(p.y > TBOX.DATA.ENEMY.stairCheckY) return true;
    return false;
  },

  triggerShake(mag, time){
    const level = TBOX.Save.get('tbox_shake', 'high');
    const mul = TBOX.DATA.SHAKE_LEVEL[level] || 1;
    const amount = TBOX.Save.getNum('tbox_shakeAmount', 100) / 100;
    this.camState.shakeMag = Math.max(this.camState.shakeMag, mag * mul * amount);
    this.camState.shakeTime = Math.max(this.camState.shakeTime, time);
  },

  setViewRoll(roll){
    this.camState.viewRoll = roll;
  },

  /* ============================================================
   * 心跳 / 呼吸
   * ============================================================ */
  updateVitals(dt){
    const p = TBOX.Player;
    if(!p) return;

    const V = TBOX.DATA.VITALS;
    const moveState = p.moveState || 'idle';

    let heartTarget = V.heartIdle;
    if(moveState === 'crouchIdle' || moveState === 'crouchWalk') heartTarget = V.heartCrouch;
    else if(moveState === 'walk') heartTarget = V.heartWalk;
    else if(moveState === 'run') heartTarget = V.heartRun;
    else if(moveState === 'sprint') heartTarget = V.heartSprint;
    else if(moveState === 'climb') heartTarget = V.heartClimb;

    const hp = p.hp;
    if(hp < 40) heartTarget += V.heartHurtHeavy;
    else if(hp < 70) heartTarget += V.heartHurtMid;
    else if(hp < 90) heartTarget += V.heartHurtLight;
    if(p.stamina < 30) heartTarget += V.heartLowStamina;

    let lungTarget = V.lungIdle;
    if(moveState === 'crouchIdle' || moveState === 'crouchWalk') lungTarget = V.lungCrouch;
    else if(moveState === 'walk') lungTarget = V.lungWalk;
    else if(moveState === 'run') lungTarget = V.lungRun;
    else if(moveState === 'sprint') lungTarget = V.lungSprint;
    else if(moveState === 'climb') lungTarget = V.lungClimb;

    if(hp < 40) lungTarget += V.lungHurtHeavy;
    else if(hp < 70) lungTarget += V.lungHurtMid;
    else if(hp < 90) lungTarget += V.lungHurtLight;
    if(p.stamina < 30) lungTarget += V.lungLowStamina;

    this.vitals.heartTarget = heartTarget;
    this.vitals.lungTarget = lungTarget;
    this.vitals.heart = TBOX.Utils.lerp(this.vitals.heart, heartTarget, Math.min(1, dt * V.lerpSpeed));
    this.vitals.lung = TBOX.Utils.lerp(this.vitals.lung, lungTarget, Math.min(1, dt * V.lerpSpeed));

    this.vitals.heartPhase += dt * (this.vitals.heart / 60);
    this.vitals.lungPhase += dt * (this.vitals.lung / 60);
    if(this.vitals.heartPhase > 1) this.vitals.heartPhase -= 1;
    if(this.vitals.lungPhase > 1) this.vitals.lungPhase -= 1;

    if(TBOX.UI && TBOX.UI.updateVitals){
      TBOX.UI.updateVitals(this.vitals, p);
    }

    if(TBOX.Save.get('tbox_heartSound', '1') === '1'){
      const heartbeatInterval = 60 / this.vitals.heart;
      if(!this.vitals.lastHeartbeat) this.vitals.lastHeartbeat = performance.now() / 1000;
      const now = performance.now() / 1000;
      if(now - this.vitals.lastHeartbeat >= heartbeatInterval){
        this.vitals.lastHeartbeat = now;
        if(TBOX.Audio && TBOX.Audio.playHeartbeat) TBOX.Audio.playHeartbeat(hp);
      }
    }

    if(TBOX.Save.get('tbox_breathSound', '1') === '1'){
      const breathInterval = 60 / this.vitals.lung;
      if(!this.vitals.lastBreath) this.vitals.lastBreath = performance.now() / 1000;
      const now = performance.now() / 1000;
      if(now - this.vitals.lastBreath >= breathInterval){
        this.vitals.lastBreath = now;
        if(TBOX.Audio && TBOX.Audio.playBreath) TBOX.Audio.playBreath(hp);
      }
    }
  },

  updateHurtFx(dt, rawDt){
    const p = TBOX.Player;
    if(!p) return;
    const FX = TBOX.DATA.HURT_FX;
    const hp = p.hp;

    const hf = document.getElementById('hitFrame');
    if(hf){
      if(this.hurtFx.hitFrameOn){
        this.hurtFx.hitFrameTimer -= rawDt * 1000;
        if(this.hurtFx.hitFrameTimer <= 0){
          hf.classList.remove('on');
          this.hurtFx.hitFrameOn = false;
        }
      }
    }

    const blink = document.getElementById('blinkOverlay');
    if(blink){
      const blinkEnabled = TBOX.Save.get('tbox_blinkFx', '1') === '1';
      if(blinkEnabled && hp < TBOX.DATA.VITALS.blinkHp && !p.dead){
        const t = 1 - hp / TBOX.DATA.VITALS.blinkHp;
        const period = TBOX.Utils.lerp(FX.blinkPeriodMax, FX.blinkPeriodMin, t);
        this.hurtFx.blinkTimer += rawDt * 1000;
        if(this.hurtFx.blinkTimer >= period){
          this.hurtFx.blinkTimer = 0;
          this.hurtFx.blinkPhase = 1;
        }
        if(this.hurtFx.blinkPhase > 0){
          const closeMs = FX.blinkCloseMs;
          const phase = 1 - this.hurtFx.blinkPhase;
          blink.style.opacity = String(1 - Math.abs(phase * 2 - 1));
          this.hurtFx.blinkPhase -= rawDt * 1000 / (closeMs * 2);
          if(this.hurtFx.blinkPhase <= 0){
            this.hurtFx.blinkPhase = 0;
            blink.style.opacity = '0';
          }
        } else {
          blink.style.opacity = '0';
        }
      } else {
        blink.style.opacity = '0';
      }
    }

    const slowMoEnabled = TBOX.Save.get('tbox_slowMo', '1') === '1';
    let slowMo = 1.0;
    if(slowMoEnabled && !p.dead){
      if(hp < 10) slowMo = FX.slowMoHp10;
      else if(hp < 20) slowMo = FX.slowMoHp20;
    }
    this.hurtFx.slowMoCurrent = TBOX.Utils.lerp(
      this.hurtFx.slowMoCurrent, slowMo,
      Math.min(1, dt * 3)
    );

    const app = document.getElementById('app');
    if(app){
      const desatEnabled = TBOX.Save.get('tbox_desatFx', '1') === '1';
      let blur = 0, desat = 0;
      if(hp < 40){
        blur = FX.blurHeavy;
        if(desatEnabled) desat = FX.desatHeavy;
      } else if(hp < 70){
        blur = FX.blurHeavy * 0.5;
      }
      app.style.filter = `blur(${blur.toFixed(2)}px) saturate(${(1 - desat).toFixed(2)})`;
    }
  },

  triggerHitFrame(){
    if(TBOX.Save.get('tbox_hitFrame', '1') !== '1') return;
    const hf = document.getElementById('hitFrame');
    if(!hf) return;
    hf.classList.add('on');
    this.hurtFx.hitFrameOn = true;
    this.hurtFx.hitFrameTimer = TBOX.DATA.HURT_FX.hitFrameIn + TBOX.DATA.HURT_FX.hitFrameOut;
  },

  triggerHitShake(dmg){
    if(TBOX.Save.get('tbox_hitShake', '1') !== '1') return;
    const FX = TBOX.DATA.HURT_FX;
    let mag = FX.hitShakeMagLight;
    let time = FX.hitShakeTimeLight;
    if(dmg >= 6){ mag = FX.hitShakeMagHeavy; time = FX.hitShakeTimeHeavy; }
    else if(dmg >= 3){ mag = FX.hitShakeMagMid; time = FX.hitShakeTimeMid; }
    this.triggerShake(mag, time);
    this.triggerHitFrame();
  },

  updateDeathFx(dt, rawDt){
    const p = TBOX.Player;
    if(!p) return;
    const D = TBOX.DATA.DEATH;

    if(p.dead && !this.deathFx.active){
      this.deathFx.active = true;
      this.deathFx.timer = 0;
      this.deathFx.fadeLevel = 0;
      this.deathFx.blinkLevel = 0;
      this.deathFx.dizzyRoll = 0;
      this.deathFx.dizzyTime = 0;

      if(TBOX.NetAudio && TBOX.NetAudio.play){
        TBOX.NetAudio.play('tinnitus', TBOX.DATA.TINNITUS.volume);
      }
      if(TBOX.Audio && TBOX.Audio.playTinnitus){
        TBOX.Audio.playTinnitus();
      }

      this.triggerShake(0.8, 0.6);
    }

    if(!p.dead && this.deathFx.active){
      this.deathFx.active = false;
      this.deathFx.timer = 0;
      this.deathFx.fadeLevel = 0;
      this.deathFx.blinkLevel = 0;
      this.deathFx.dizzyRoll = 0;

      const ds = document.getElementById('deathScreen');
      if(ds) ds.style.opacity = '0';
      const hv = document.getElementById('hurtVignette');
      if(hv) hv.style.opacity = '0';
      const blink = document.getElementById('blinkOverlay');
      if(blink) blink.style.opacity = '0';
    }

    if(!this.deathFx.active) return;

    this.deathFx.timer += dt;
    this.deathFx.dizzyTime += dt;
    const t = this.deathFx.timer;

    if(this.camState.mode === 'fps'){
      const dizzyAmp = D.dizzyRollAmp * Math.max(0, 1 - t / 2.0);
      this.deathFx.dizzyRoll = Math.sin(this.deathFx.dizzyTime * D.dizzySpeed) * dizzyAmp;
    } else {
      this.deathFx.dizzyRoll = 0;
    }

    if(t >= D.fadeStart){
      const fadeT = Math.min(1, (t - D.fadeStart) / D.fadeDur);
      this.deathFx.fadeLevel = fadeT * fadeT;
    }

    if(t >= D.blinkStart){
      const blinkT = Math.min(1, (t - D.blinkStart) / (D.blinkEnd - D.blinkStart));
      this.deathFx.blinkLevel = blinkT * blinkT;
    }

    const hv = document.getElementById('hurtVignette');
    if(hv){
      const fade = this.deathFx.fadeLevel;
      const r = 100 - fade * 70;
      const a = 0.6 + fade * 0.4;
      hv.style.background = `radial-gradient(ellipse at 50% 50%,
        rgba(0,0,0,0) ${r * 0.3}%,
        rgba(40,0,0,${a * 0.5}) ${r * 0.6}%,
        rgba(80,0,10,${a * 0.85}) ${r}%,
        rgba(20,0,0,${a}) 100%)`;
      hv.style.opacity = String(Math.min(1, fade));
    }

    const blink = document.getElementById('blinkOverlay');
    if(blink){
      const b = this.deathFx.blinkLevel;
      const h = b * 50;
      blink.style.setProperty('--blink-h', h + '%');
      blink.style.opacity = String(b);
      blink.style.background = `linear-gradient(180deg,
        rgba(0,0,0,${b}) 0%,
        rgba(0,0,0,0) ${h}%,
        rgba(0,0,0,0) ${100 - h}%,
        rgba(0,0,0,${b}) 100%)`;
    }

    const app = document.getElementById('app');
    if(app && this.camState.mode === 'fps'){
      const dizzyBlur = D.dizzyBlur * Math.max(0, 1 - t / 2.0);
      app.style.filter = `blur(${dizzyBlur.toFixed(2)}px)`;
    }

    if(t >= D.blinkEnd){
      const ds = document.getElementById('deathScreen');
      if(ds){
        ds.style.display = 'block';
        const blackT = Math.min(1, (t - D.blinkEnd) / 0.3);
        ds.style.opacity = String(blackT);
      }
    }
  },

  /* ============================================================
   * 相机更新
   * ============================================================ */
  updateCamera(p, character, dt, rawDt){
    const D = TBOX.DATA;

    const targetEye = p.crouching ? D.EYE_H_CROUCH : D.EYE_H;
    if(p.eyeH === undefined) p.eyeH = D.EYE_H;
    p.eyeH = TBOX.Utils.lerp(p.eyeH, targetEye, Math.min(1, dt * 8));

    const headWorld = new THREE.Vector3();
    if(character && character.head){
      character.head.getWorldPosition(headWorld);
    } else {
      headWorld.set(p.x, p.y + p.eyeH, p.z);
    }

    if(this.camState.mode === 'fps' || this.camState.transition < 0.5){
      headWorld.y = p.y + p.eyeH;
    }

    let shX = 0, shY = 0;
    if(this.camState.shakeTime > 0){
      this.camState.shakeTime -= rawDt;
      const k = Math.max(0, this.camState.shakeTime);
      shX = (Math.random() - 0.5) * this.camState.shakeMag * k * 6;
      shY = (Math.random() - 0.5) * this.camState.shakeMag * k * 6;
      if(this.camState.shakeTime <= 0) this.camState.shakeMag = 0;
    }

    /* ★ 第三阶段：sway 收敛（乘 0.6） */
    const swayEnabled = TBOX.Save.get('tbox_viewSway', '1') === '1';
    let swayX = 0, swayY = 0;
    if(swayEnabled && !p.dead){
      const V = D.VIEW_SWAY;
      const moveState = p.moveState || 'idle';
      let speed = V.speedIdle;
      if(moveState === 'walk' || moveState === 'crouchWalk') speed = V.speedWalk;
      else if(moveState === 'run') speed = V.speedRun;
      else if(moveState === 'sprint') speed = V.speedSprint;

      this.swayTime += dt * speed;
      const ampMul = (TBOX.Save.getNum('tbox_swayAmount', 100) / 100) * 0.6;
      swayX = Math.sin(this.swayTime) * V.ampX * ampMul;
      swayY = Math.cos(this.swayTime * 1.7) * V.ampY * ampMul;
      const breathPhase = performance.now() / 1000 * V.breathSpeed;
      const breathIntensity = (p.crouching ? 0.6 : 1.0) * ampMul;
      swayY += Math.sin(breathPhase) * V.breathAmp * breathIntensity;
      swayX += Math.cos(breathPhase * 0.7) * V.breathAmp * 0.4 * breathIntensity;
    }

    /* ★ 第三阶段：runShake 收敛（乘 0.6） */
    const runShakeEnabled = TBOX.Save.get('tbox_runShake', '1') === '1';
    let runShakeX = 0, runShakeY = 0;
    if(runShakeEnabled && !p.dead){
      const R = D.RUN_SHAKE;
      const moveState = p.moveState || 'idle';
      let amp = 0;
      if(moveState === 'walk') amp = R.walkAmp;
      else if(moveState === 'run') amp = R.runAmp;
      else if(moveState === 'sprint') amp = R.sprintAmp;

      if(amp > 0){
        const ampMul = (TBOX.Save.getNum('tbox_runShakeAmount', 100) / 100) * 0.6;
        const phase = p.runPhase * 2;
        runShakeX = Math.sin(phase) * amp * ampMul;
        runShakeY = Math.abs(Math.cos(phase)) * amp * 0.7 * ampMul;
      }
    }

    const cy = Math.cos(this.camState.yaw), sy = Math.sin(this.camState.yaw);
    const fwdX = -sy, fwdZ = -cy;

    const targetTrans = this.camState.mode === 'tps' ? 1 : 0;
    this.camState.transition = TBOX.Utils.lerp(
      this.camState.transition, targetTrans,
      Math.min(1, dt / D.TPS_TRANSITION)
    );

    const inspectCamY = p.inspecting ? (p.inspectCamY || 0) : 0;
    const slideVis = p.slideVis || 0;
    const slideCamDip = slideVis * D.SLIDE_CAM_DIP;

    const camFwd = D.CAM_FWD_OFFSET;
    const camHeight = D.CAM_HEIGHT_OFFSET;

    if(this.camState.transition < 0.001){
      this.camera.position.set(
        headWorld.x + shX + fwdX * camFwd,
        headWorld.y + shY + inspectCamY - slideCamDip + camHeight,
        headWorld.z + fwdZ * camFwd
      );
    } else {
      const tpsDist = TBOX.Save.getNum('tbox_tpsDist', 45) / 10;
      const tpsH = TBOX.Save.getNum('tbox_tpsH', 16) / 10;
      const backX = Math.sin(this.camState.yaw);
      const backZ = Math.cos(this.camState.yaw);

      let tpsX, tpsY, tpsZ;
      if(p.dead && character && character.head){
        tpsX = headWorld.x + backX * tpsDist;
        tpsY = headWorld.y + tpsH;
        tpsZ = headWorld.z + backZ * tpsDist;
      } else {
        tpsX = p.x + backX * tpsDist;
        tpsY = p.y + tpsH;
        tpsZ = p.z + backZ * tpsDist;
      }
      const safeY = Math.max(0.40, tpsY);

      const fpsX = headWorld.x + shX + fwdX * camFwd;
      const fpsY = headWorld.y + shY + inspectCamY - slideCamDip + camHeight;
      const fpsZ = headWorld.z + fwdZ * camFwd;

      const t = this.camState.transition;
      this.camera.position.set(
        TBOX.Utils.lerp(fpsX, tpsX, t),
        TBOX.Utils.lerp(fpsY, safeY, t),
        TBOX.Utils.lerp(fpsZ, tpsZ, t)
      );
    }

    if(this.camera.position.y < 0.30) this.camera.position.y = 0.30;

    /* ★ 第三阶段：viewRoll 收敛 —— 只有滑铲/闪避/倒地才允许 roll，且上限收紧到 0.25 */
    const slideRollActive = p.sliding || p.dodging || p.knockedDown;
    if(!slideRollActive && Math.abs(this.camState.viewRoll) > 0.001){
      this.camState.viewRoll = TBOX.Utils.lerp(
        this.camState.viewRoll, 0,
        Math.min(1, dt * 10)
      );
      if(Math.abs(this.camState.viewRoll) < 0.001){
        this.camState.viewRoll = 0;
      }
    } else if(slideRollActive){
      const MAX = 0.25;
      this.camState.viewRoll = TBOX.Utils.clamp(this.camState.viewRoll, -MAX, MAX);
    }

    if(p.dead){
      if(this.camState.mode === 'fps'){
        this.camState.viewRoll = this.deathFx.dizzyRoll;
      } else {
        this.camState.viewRoll = TBOX.Utils.lerp(
          this.camState.viewRoll,
          p.deathDir === 2 ? -0.6 : (p.deathDir === -2 ? 0.6 : 0),
          Math.min(1, dt * 4)
        );
      }
    }

    const slidePitch = slideVis * D.SLIDE_PITCH_ADD;
    const viewShakeX = (Math.random() - 0.5) * p.camKick * 0.5;
    const viewShakeY = (Math.random() - 0.5) * p.camKick * 0.5;

    let deathPitch = 0;
    if(p.dead && this.camState.mode === 'fps'){
      const q = Math.min(1, p.deathTimer / D.DEATH.fallDur);
      if(p.deathDir === 1) deathPitch = q * 0.8;
      else if(p.deathDir === -1) deathPitch = -q * 0.8;
    }

    const totalYaw = this.camState.yaw + viewShakeX + swayX + runShakeX;
    const totalPitch = this.camState.pitch + slidePitch + viewShakeY + swayY + runShakeY + deathPitch;

    this.camera.rotation.set(
      totalPitch,
      totalYaw,
      this.camState.viewRoll,
      'YXZ'
    );

    if(character && character.head && character.head.material){
      character.head.material.opacity = this.camState.transition * 0.85;
    }

    const baseFov = TBOX.Save.getNum('tbox_fov', 120);
    const attackFov = (p.attackTimer > 0 && ['leftKick','rightKick','knee','push'].includes(p.attackType)) ? 4 : 0;
    const slideFov = slideVis * D.SLIDE_FOV_ADD;
    p.fovKick = TBOX.Utils.lerp(p.fovKick, 0, Math.min(1, rawDt * 12));
    const targetFov = baseFov + p.fovKick + attackFov + slideFov;
    if(Math.abs(this.camera.fov - targetFov) > 0.01){
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  },

  toggleView(){
    this.camState.mode = this.camState.mode === 'fps' ? 'tps' : 'fps';
    TBOX.UI.updateMode(this.camState.mode);
    TBOX.Events.emit(TBOX.EVENTS.CAM_SWITCH, this.camState.mode);
  },

  start(){
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();

    if(!this.isTouch && this.controls){
      try { this.controls.lock(); } catch(e){}
    }

    this._startAmbient();

    requestAnimationFrame((now) => this.loop(now));
  },

  _startAmbient(){
    if(!TBOX.NetAudio) return;
    try {
      if(!this.ambientWind && TBOX.NetAudio.loaded.wind){
        this.ambientWind = TBOX.NetAudio.loaded.wind.cloneNode();
        this.ambientWind.loop = true;
        this.ambientWind.volume = 0.15;
        this.ambientWind.play().catch(() => {});
      }
      if(!this.ambientBirds && TBOX.NetAudio.loaded.birds){
        this.ambientBirds = TBOX.NetAudio.loaded.birds.cloneNode();
        this.ambientBirds.loop = true;
        this.ambientBirds.volume = 0.10;
        this.ambientBirds.play().catch(() => {});
      }
    } catch(e){}
  },

  requestLock(){
    if(this.isTouch) return;
    if(this.controls && !this.controls.isLocked){
      try { this.controls.lock(); } catch(e){}
    }
  },

  pause(){ this.paused = true; },
  resume(){ this.paused = false; this.lastTime = performance.now(); },

  loop(now){
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if(!isFinite(rawDt) || rawDt <= 0){
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const fpsLimit = TBOX.Save.getNum('tbox_fpsLimit', 60);
    if(fpsLimit > 0 && fpsLimit < 240){
      const minFrameTime = 1000 / fpsLimit;
      if(now - (this._lastFrameTime || 0) < minFrameTime) return;
      this._lastFrameTime = now;
    }

    let timeScale = TBOX.Save.getNum('tbox_timeScale', 100) / 100;

    if(TBOX.Save.get('tbox_slowMo', '1') === '1' && this.player && !this.player.dead){
      timeScale *= this.hurtFx.slowMoCurrent;
    }

    const dt = rawDt * timeScale;

    if(this.paused){
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.fpsAcc += rawDt;
    this.fpsFrames++;
    if(this.fpsAcc >= 0.5){
      this.fpsValue = Math.round(this.fpsFrames / this.fpsAcc);
      /* ★ 第三阶段：FPS 开关统一判定（'on' 显示） */
      if(this.player && TBOX.Save.get('tbox_showfps', 'off') === 'on'){
        TBOX.UI.updateFPS(this.fpsValue);
      }
      if(this.player && TBOX.Save.get('tbox_showCoord', '0') === '1'){
        TBOX.UI.updateCoord(this.player);
      }
      this.fpsAcc = 0; this.fpsFrames = 0;
    }

    /* ★ 第三阶段：hitStop 全局帧冻结 */
    let hitStopDt = dt;
    if(this.player && this.player.hitStop > 0){
      this.player.hitStop -= rawDt;
      hitStopDt = dt * 0.15;
    }

    if(this.onUpdate) this.onUpdate(hitStopDt, now);
    if(this.onUpdateAction) this.onUpdateAction(hitStopDt, now);
    if(this.onUpdateEnemy) this.onUpdateEnemy(hitStopDt, now);

    if(this.enemy && this.enemy.group && this.enemy.alive){
      this.resolveEnemyCollision(this.enemy);
    }

    TBOX.Action.updateEnemyPose(hitStopDt, now);

    this.updateVitals(dt);
    this.updateHurtFx(dt, rawDt);
    this.updateDeathFx(dt, rawDt);

    if(this.player && this.character){
      this.updateCamera(this.player, this.character, dt, rawDt);
    }

    if(this.onUpdateFragments) this.onUpdateFragments(rawDt);

    TBOX.UI.updateCompass(this.camState.yaw);
    TBOX.UI.updateHurtVignette(this.player);
    TBOX.UI.updateHpHud(this.player);

    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    if(shadowOn){
      this.shadowTick = (this.shadowTick + 1) % this.Q.shadowTick;
      if(this.shadowTick === 0 && this.player){
        this.sunLight.position.set(this.player.x + 24, 46, this.player.z + 18);
        this.sunLight.target.position.set(this.player.x, 0, this.player.z);
        this.renderer.shadowMap.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
};