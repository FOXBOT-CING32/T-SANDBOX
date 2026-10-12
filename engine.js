/* ============================================================
 * engine.js · 游戏引擎系统
 * V1.0.0 · 90 独立几何体 + 物理系统 + 抓取系统
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
  props: [],
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

  composer: null,
  bloomPass: null,
  fxaaPass: null,
  renderPass: null,
  motionBlurPass: null,
  filmGrainPass: null,
  colorGradePass: null,
  postProcessingEnabled: false,
  postProcessingAllowed: true,

  csm: null,
  csmEnabled: false,

  aabbStatic: [],
  aabbDynamic: [],

  _chSpreadCurrent: 0,

  camState: {
    yaw: 0, pitch: 0, mode: 'fps', transition: 0, viewRoll: 0, shakeTime: 0, shakeMag: 0
  },

  swayTime: 0, swayX: 0, swayY: 0,
  runShakeX: 0, runShakeY: 0,

  vitals: { heart: 72, heartTarget: 72, lung: 16, lungTarget: 16, heartPhase: 0, lungPhase: 0, lastHeartbeat: 0, lastBreath: 0 },
  hurtFx: { blinkPhase: 0, blinkTimer: 0, hitFrameOn: false, hitFrameTimer: 0, slowMoCurrent: 1.0 },
  deathFx: { active: false, timer: 0, fadeLevel: 0, blinkLevel: 0, dizzyRoll: 0, dizzyTime: 0, camFollowHead: true },

  player: null, character: null, dummy: null,
  keys: {}, isTouch: false,
  ambientWind: null, ambientBirds: null,

  /* ★ 抓取状态 */
  grabbedProp: null,
  grabDist: 0,

  _tmpHeadWorld: null,
  _tmpHeadQuat: null,
  _tmpEuler: null,
  _tmpLookAt: null,
  _tmpShadowQuat: null,
  _lastFilter: '',

  _propMatCache: new Map(),

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

    this.postProcessingAllowed = (perf !== 'low');
    if(TBOX.Save.get('tbox_perfMode', '0') === '1') this.postProcessingAllowed = false;

    const aa = TBOX.Save.get('tbox_aa', 'off');
    this.renderer = new THREE.WebGLRenderer({ antialias: aa === 'high', powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    const resScale = TBOX.Save.getNum('tbox_resScale', 100) / 100;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixelRatio * resScale));
    this._applyToneMapping();
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    this.renderer.shadowMap.enabled = shadowOn;
    this._applyShadowType();
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
    this.sunLight.shadow.radius = TBOX.Save.getNum('tbox_shadowSoft', 2);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.groundMat = new THREE.MeshStandardMaterial({ color: TBOX.DATA.COLOR.ground, roughness: 1, metalness: 0 });
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
      },
      undefined,
      () => { console.warn('[Engine] 草地贴图加载失败'); }
    );

    if(TBOX.Save.get('tbox_hdr', '0') === '1') this._loadHDR();
    else this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);

    this._applyLighting(TBOX.Save.get('tbox_lighting', '0') === '1');
    this._applyLightIntensities();
    this._applyFogDensity();
    this._buildStairs();
    this._bindInput();
    this._bindSettings();

    this._initPostProcessing();

    if(TBOX.Save.get('tbox_csmEnabled', '0') === '1'){
      setTimeout(() => this._initCSM(), 100);
    }

    addEventListener('resize', () => this._onResize());

    this._tmpHeadWorld = new THREE.Vector3();
    this._tmpHeadQuat = new THREE.Quaternion();
    this._tmpEuler = new THREE.Euler();
    this._tmpLookAt = new THREE.Vector3();
    this._tmpShadowQuat = new THREE.Quaternion();
  },

  addAABB(box){
    this.aabbStatic.push(box);
    return box;
  },

  addDynamicAABB(box){
    this.aabbDynamic.push(box);
    return box;
  },

  clearDynamicAABB(){
    this.aabbDynamic.length = 0;
  },

  _resolveAABBHorizontal(p, box, radius){
    const dx = p.x - box.x;
    const dz = p.z - box.z;
    const halfW = box.hw + radius;
    const halfD = box.hd + radius;
    if(Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) return false;
    if(p.y >= box.topY - 0.15) return false;
    if(p.y + TBOX.DATA.PLAYER_HEIGHT <= box.bottomY) return false;
    const overlapX = halfW - Math.abs(dx);
    const overlapZ = halfD - Math.abs(dz);
    if(overlapX < overlapZ) p.x += (dx > 0 ? overlapX : -overlapX);
    else p.z += (dz > 0 ? overlapZ : -overlapZ);
    return true;
  },

  _resolveAABBGround(p, box){
    const dx = p.x - box.x;
    const dz = p.z - box.z;
    if(Math.abs(dx) >= box.hw || Math.abs(dz) >= box.hd) return -Infinity;
    if(p.y >= box.topY - 0.15) return box.topY;
    return -Infinity;
  },

  _getPropMat(colorHex){
    const key = colorHex || '#ffffff';
    let m = this._propMatCache.get(key);
    if(!m){
      m = new THREE.MeshStandardMaterial({
        color: colorHex || '#ffffff',
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.75,
        metalness: 0.05
      });
      this._propMatCache.set(key, m);
    }
    return m;
  },

  _initPostProcessing(){
    if(!this.postProcessingAllowed) return;
    if(typeof THREE.EffectComposer === 'undefined') return;
    try {
      const w = innerWidth, h = innerHeight;
      this.composer = new THREE.EffectComposer(this.renderer);
      this.renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.renderPass.renderToScreen = false;
      this.composer.addPass(this.renderPass);

      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(w, h),
        TBOX.Save.getNum('tbox_bloomStrength', 50) / 100,
        0.4, 0.85
      );
      this.bloomPass.enabled = TBOX.Save.get('tbox_bloom', '0') === '1';
      this.bloomPass.renderToScreen = false;
      this.composer.addPass(this.bloomPass);

      try {
        const MotionBlurShader = {
          uniforms: { tDiffuse: { value: null }, intensity: { value: 0.5 }, time: { value: 0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform sampler2D tDiffuse; uniform float intensity; uniform float time; varying vec2 vUv;
            void main(){
              vec4 sum=vec4(0.0); float count=0.0;
              for(float i=0.0;i<8.0;i++){ float t=i/8.0; vec2 offset=vec2(0.0,t*intensity*0.01); sum+=texture2D(tDiffuse,vUv+offset); count+=1.0; }
              vec4 base=texture2D(tDiffuse,vUv); gl_FragColor=mix(base,sum/count,0.5);
            }`
        };
        const mbPass = new THREE.ShaderPass(MotionBlurShader);
        mbPass.enabled = TBOX.Save.get('tbox_motionBlur', '0') === '1';
        mbPass.renderToScreen = false;
        this.motionBlurPass = mbPass;
        this.composer.addPass(mbPass);
      } catch(e){ console.warn('[Engine] 运动模糊初始化失败', e); }

      try {
        const FilmGrainShader = {
          uniforms: { tDiffuse: { value: null }, time: { value: 0 }, intensity: { value: 0.15 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform sampler2D tDiffuse; uniform float time; uniform float intensity; varying vec2 vUv;
            float rand(vec2 co){ return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453); }
            void main(){ vec4 color=texture2D(tDiffuse,vUv); float grain=rand(vUv+time)-0.5; color.rgb+=grain*intensity; gl_FragColor=color; }`
        };
        const fgPass = new THREE.ShaderPass(FilmGrainShader);
        fgPass.enabled = TBOX.Save.get('tbox_filmGrain', '0') === '1';
        fgPass.renderToScreen = false;
        this.filmGrainPass = fgPass;
        this.composer.addPass(fgPass);
      } catch(e){ console.warn('[Engine] 胶片颗粒初始化失败', e); }

      try {
        const ColorGradeShader = {
          uniforms: { tDiffuse: { value: null }, saturation: { value: 1.0 }, contrast: { value: 1.0 }, brightness: { value: 1.0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform float brightness; varying vec2 vUv;
            void main(){
              vec4 color=texture2D(tDiffuse,vUv);
              float gray=dot(color.rgb,vec3(0.299,0.587,0.114));
              color.rgb=mix(vec3(gray),color.rgb,saturation);
              color.rgb=(color.rgb-0.5)*contrast+0.5;
              color.rgb*=brightness;
              gl_FragColor=color;
            }`
        };
        const cgPass = new THREE.ShaderPass(ColorGradeShader);
        cgPass.enabled = TBOX.Save.get('tbox_colorGrade', '0') === '1';
        cgPass.uniforms.saturation.value = TBOX.Save.getNum('tbox_colorSaturation', 100) / 100;
        cgPass.uniforms.contrast.value = TBOX.Save.getNum('tbox_colorContrast', 100) / 100;
        cgPass.uniforms.brightness.value = TBOX.Save.getNum('tbox_colorBrightness', 100) / 100;
        cgPass.renderToScreen = false;
        this.colorGradePass = cgPass;
        this.composer.addPass(cgPass);
      } catch(e){ console.warn('[Engine] 色彩校正初始化失败', e); }

      if(typeof THREE.ShaderPass !== 'undefined' && THREE.FXAAShader){
        const fxaaShader = THREE.FXAAShader;
        const fxaaPass = new THREE.ShaderPass(fxaaShader);
        const fxaaEnabled = TBOX.Save.get('tbox_fxaa', 'off') !== 'off';
        fxaaPass.enabled = fxaaEnabled;
        const pixelRatio = this.renderer.getPixelRatio();
        fxaaPass.uniforms['resolution'].value.x = 1 / (w * pixelRatio);
        fxaaPass.uniforms['resolution'].value.y = 1 / (h * pixelRatio);
        fxaaPass.renderToScreen = false;
        this.fxaaPass = fxaaPass;
        this.composer.addPass(fxaaPass);
      }

      this._updateRenderToScreen();
      this.postProcessingEnabled = true;
    } catch(e){
      console.warn('[Engine] 后处理初始化失败', e);
      this.postProcessingEnabled = false;
    }
  },

  _updateRenderToScreen(){
    if(!this.composer) return;
    var passes = this.composer.passes;
    for(var i = 0; i < passes.length; i++) passes[i].renderToScreen = false;
    for(var j = passes.length - 1; j >= 0; j--){
      if(passes[j].enabled){ passes[j].renderToScreen = true; break; }
    }
  },

  _applyPostProcessing(){
    if(!this.postProcessingEnabled) return;
    if(this.motionBlurPass) this.motionBlurPass.enabled = TBOX.Save.get('tbox_motionBlur', '0') === '1';
    if(this.filmGrainPass) this.filmGrainPass.enabled = TBOX.Save.get('tbox_filmGrain', '0') === '1';
    if(this.colorGradePass){
      this.colorGradePass.enabled = TBOX.Save.get('tbox_colorGrade', '0') === '1';
      this.colorGradePass.uniforms.saturation.value = TBOX.Save.getNum('tbox_colorSaturation', 100) / 100;
      this.colorGradePass.uniforms.contrast.value = TBOX.Save.getNum('tbox_colorContrast', 100) / 100;
      this.colorGradePass.uniforms.brightness.value = TBOX.Save.getNum('tbox_colorBrightness', 100) / 100;
    }
    this._updateRenderToScreen();
  },

  _initCSM(){
    if(typeof THREE.CSM === 'undefined'){ console.warn('[Engine] CSM 未加载'); return; }
    if(this.csm) return;
    try {
      const csm = new THREE.CSM({
        maxFar: 200, cascades: 3, mode: 'practical', parent: this.scene,
        shadowMapSize: 2048,
        lightDirection: new THREE.Vector3(0.5, 1, 0.3).normalize(),
        camera: this.camera, lightIntensity: 2.0, lightNear: 1, lightFar: 200, lightMargin: 100
      });
      csm.fade = true;
      if(this.sunLight){
        this.sunLight.castShadow = false;
        this.scene.remove(this.sunLight);
        this.scene.remove(this.sunLight.target);
      }
      if(this.ground) csm.setupMaterial(this.ground.material);
      this.csm = csm;
      this.csmEnabled = true;
      console.log('[Engine] CSM 已启用');
    } catch(e){
      console.warn('[Engine] CSM 初始化失败', e);
      this.csmEnabled = false;
    }
  },

  _disableCSM(){
    if(!this.csm) return;
    try { this.csm.dispose(); } catch(e){}
    this.csm = null;
    this.csmEnabled = false;
    if(!this.sunLight){
      this.sunLight = new THREE.DirectionalLight(0xfff2dc, 2.0);
      this.sunLight.position.set(24, 46, 18);
      this.scene.add(this.sunLight);
      this.scene.add(this.sunLight.target);
    }
    this._applyLighting(TBOX.Save.get('tbox_lighting', '0') === '1');
    console.log('[Engine] CSM 已禁用');
  },

  _applyShadowType(){
    const type = TBOX.Save.get('tbox_shadowType', 'pcfsoft');
    const T = THREE;
    if(type === 'pcf') this.renderer.shadowMap.type = T.PCFShadowMap;
    else if(type === 'vsm') this.renderer.shadowMap.type = T.VSMShadowMap;
    else this.renderer.shadowMap.type = T.PCFSoftShadowMap;
  },

  _applyToneMapping(){
    const tm = TBOX.Save.get('tbox_toneMapping', 'aces');
    const T = THREE;
    if(tm === 'reinhard') this.renderer.toneMapping = T.ReinhardToneMapping;
    else if(tm === 'cineon') this.renderer.toneMapping = T.CineonToneMapping;
    else if(tm === 'linear') this.renderer.toneMapping = T.LinearToneMapping;
    else this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = TBOX.Save.getNum('tbox_exposure', 105) / 100;
  },

  _applyLightIntensities(){
    const amb = TBOX.Save.getNum('tbox_ambientIntensity', 100) / 100;
    const lightingOn = TBOX.Save.get('tbox_lighting', '0') === '1';
    if(this.hemiLight) this.hemiLight.intensity = (lightingOn ? 0.85 : 0.2) * amb;
    if(this.sunLight) this.sunLight.intensity = lightingOn ? 2.0 : 0.3;
    if(this.csm && this.csm.lightIntensity !== undefined){
      this.csm.lightIntensity = lightingOn ? 2.0 : 0.3;
    }
  },

  _applyFogDensity(){
    if(!this.scene) return;
    const fogEnabled = TBOX.Save.get('tbox_fog', '1') === '1';
    if(!fogEnabled){ this.scene.fog = null; return; }
    const density = TBOX.Save.getNum('tbox_fogDensity', 100) / 100;
    const near = 120 * (1 - density * 0.5);
    const far = 480 * density;
    this.scene.fog = new THREE.Fog(TBOX.DATA.COLOR.sky, Math.max(10, near), Math.max(50, far));
  },

  _applyBloom(){
    if(!this.bloomPass) return;
    const enabled = TBOX.Save.get('tbox_bloom', '0') === '1';
    this.bloomPass.enabled = enabled;
    this.bloomPass.strength = TBOX.Save.getNum('tbox_bloomStrength', 50) / 100;
    this._updateRenderToScreen();
  },

  _applyFXAA(){
    if(!this.fxaaPass) return;
    const enabled = TBOX.Save.get('tbox_fxaa', 'off') !== 'off';
    this.fxaaPass.enabled = enabled;
    this._updateRenderToScreen();
  },

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

  _applyLighting(on){ this._applyLightIntensities(); },

  _buildStairs(){
    const S = TBOX.DATA.STAIRS;
    const mat = new THREE.MeshStandardMaterial({ color: TBOX.DATA.COLOR.stair, roughness: .85, metalness: .05 });
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    this.stairs.length = 0;
    this.aabbStatic.length = 0;
    for(let i = 0; i < S.count; i++){
      const h = S.height * (i + 1);
      const geo = new THREE.BoxGeometry(S.width, h, S.depth);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(S.baseX, h / 2, S.baseZ + i * S.depth);
      mesh.castShadow = shadowOn;
      mesh.receiveShadow = shadowOn;
      this.scene.add(mesh);
      const stair = {
        mesh, x: S.baseX, z: S.baseZ + i * S.depth,
        topY: h, bottomY: 0,
        halfW: S.width / 2, halfD: S.depth / 2,
        index: i
      };
      this.stairs.push(stair);
      this.addAABB({
        x: stair.x, y: h / 2, z: stair.z,
        hw: stair.halfW, hh: h / 2, hd: stair.halfD,
        topY: stair.topY, bottomY: stair.bottomY,
        tag: 'stair'
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
    document.addEventListener('pointerlockchange', () => { pcMouseLocked = document.pointerLockElement !== null; });
    document.addEventListener('mousemove', (e) => {
      if(!this.running || this.isTouch || !pcMouseLocked) return;
      if(this.paused) return;
      const sens = TBOX.Save.getNum('tbox_sens', 22);
      const s = 0.0022 * (sens / 22);
      const invertY = TBOX.Save.get('tbox_invertY', '0') === '1' ? -1 : 1;
      this.camState.yaw -= e.movementX * s;
      this.camState.pitch -= e.movementY * s * invertY;
      this.camState.pitch = TBOX.Utils.clamp(this.camState.pitch, TBOX.DATA.PITCH_MIN, TBOX.DATA.PITCH_MAX);
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
    TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, (data) => this._applySetting(data.key, data.value));
    window.addEventListener('message', (e) => {
      if(!e.data) return;
      if(e.data.type === 'tbox-setting-changed'){
        this._applySetting(e.data.key, e.data.value);
      }
    });
  },

  _applySetting(key, value){
    switch(key){
      case 'tbox_fov':
        if(this.camera){ this.camera.fov = Number(value); this.camera.updateProjectionMatrix(); }
        break;
      case 'tbox_sens':
        if(this.controls) this.controls.pointerSpeed = Number(value) / 10;
        break;
      case 'tbox_resScale':
        this._refreshRenderer();
        break;
      case 'tbox_quality':
        try {
          const perf = TBOX.Utils.detectPerf();
          const finalQ = value === 'auto' ? perf : value;
          this.Q = TBOX.DATA.QUALITY[finalQ] || TBOX.DATA.QUALITY.mid;
          this.postProcessingAllowed = (perf !== 'low');
        } catch(e){}
        this._refreshRenderer();
        break;
      case 'tbox_perfMode':
        this.postProcessingAllowed = (value !== '1');
        if(!this.postProcessingAllowed && this.postProcessingEnabled){
          this.postProcessingEnabled = false;
        } else if(this.postProcessingAllowed && !this.postProcessingEnabled){
          this._initPostProcessing();
        }
        break;
      case 'tbox_shadow': {
        const on = value === '1';
        if(this.renderer) this.renderer.shadowMap.enabled = on;
        if(this.sunLight) this.sunLight.castShadow = on;
        if(this.ground) this.ground.receiveShadow = on;
        this.stairs.forEach(s => { s.mesh.castShadow = on; s.mesh.receiveShadow = on; });
        this.props.forEach(p => { if(p.mesh){ p.mesh.castShadow = on; p.mesh.receiveShadow = on; } });
        if(this.character) this.character.root.traverse(o => { if(o.isMesh){ o.castShadow = on; o.receiveShadow = on; } });
        if(this.dummy && this.dummy.group) this.dummy.group.traverse(o => { if(o.isMesh){ o.castShadow = on; o.receiveShadow = on; } });
        break;
      }
      case 'tbox_shadowType':
        this._applyShadowType();
        break;
      case 'tbox_shadowDist': {
        if(!this.sunLight) break;
        const dists = { near: 30, mid: 80, far: 150 };
        const d = dists[value] || 80;
        this.sunLight.shadow.camera.far = d;
        this.sunLight.shadow.camera.updateProjectionMatrix();
        break;
      }
      case 'tbox_ambientIntensity':
      case 'tbox_lighting':
        this._applyLightIntensities();
        break;
      case 'tbox_toneMapping':
      case 'tbox_exposure':
        this._applyToneMapping();
        break;
      case 'tbox_fxaa':
        this._applyFXAA();
        break;
      case 'tbox_shadowSoft':
        if(this.sunLight) this.sunLight.shadow.radius = Number(value);
        break;
      case 'tbox_fogDensity':
      case 'tbox_fog':
        this._applyFogDensity();
        break;
      case 'tbox_bloom':
      case 'tbox_bloomStrength':
        this._applyBloom();
        break;
      case 'tbox_motionBlur':
      case 'tbox_filmGrain':
      case 'tbox_colorGrade':
      case 'tbox_colorSaturation':
      case 'tbox_colorContrast':
      case 'tbox_colorBrightness':
        this._applyPostProcessing();
        break;
      case 'tbox_csmEnabled':
        if(value === '1') this._initCSM();
        else this._disableCSM();
        break;
      case 'tbox_vitals':
        if(TBOX.UI && TBOX.UI.els && TBOX.UI.els.vitalsHud){
          TBOX.UI.els.vitalsHud.style.display = value === '1' ? 'flex' : 'none';
        }
        break;
      case 'tbox_shadowQ': {
        if(!this.sunLight) break;
        const sizes = { low: 512, mid: 1024, high: 2048, ultra: 4096 };
        const s = sizes[value] || 1024;
        this.sunLight.shadow.mapSize.set(s, s);
        if(this.sunLight.shadow.map){ this.sunLight.shadow.map.dispose(); this.sunLight.shadow.map = null; }
        break;
      }
      case 'tbox_hdr':
        if(value === '1'){ if(!this.hdrEnabled) this._loadHDR(); }
        else {
          if(this.hdrTexture){ this.hdrTexture.dispose(); this.hdrTexture = null; }
          this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
          this.scene.environment = null;
          this.hdrEnabled = false;
        }
        break;
    }
  },

  _refreshRenderer(){
    if(!this.renderer) return;
    try {
      const Q = this.Q || TBOX.DATA.QUALITY.mid;
      const resScale = TBOX.Save.getNum('tbox_resScale', 100) / 100;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio * resScale));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if(this.composer){
        this.composer.setPixelRatio(this.renderer.getPixelRatio());
        this.composer.setSize(window.innerWidth, window.innerHeight);
      }
      if(this.fxaaPass && this.fxaaPass.uniforms && this.fxaaPass.uniforms['resolution']){
        const pixelRatio = this.renderer.getPixelRatio();
        this.fxaaPass.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        this.fxaaPass.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
      }
    } catch(e){ console.warn('[Engine] _refreshRenderer error:', e); }
  },

  _applyAllSettings(){
    try {
      const keys = [
        'tbox_quality', 'tbox_resScale', 'tbox_aa',
        'tbox_lighting', 'tbox_shadow', 'tbox_shadowQ',
        'tbox_fog', 'tbox_bloom', 'tbox_vignette', 'tbox_speedlines',
        'tbox_hdr', 'tbox_shadowType', 'tbox_shadowDist',
        'tbox_ambientIntensity',
        'tbox_toneMapping', 'tbox_exposure', 'tbox_fxaa',
        'tbox_shadowSoft', 'tbox_fogDensity', 'tbox_bloomStrength',
        'tbox_csmEnabled', 'tbox_fov',
        'tbox_motionBlur', 'tbox_filmGrain', 'tbox_colorGrade',
        'tbox_colorSaturation', 'tbox_colorContrast', 'tbox_colorBrightness',
        'tbox_perfMode'
      ];
      keys.forEach(function(k){
        try {
          const v = TBOX.Save.get(k);
          if(v !== null && v !== undefined) TBOX.Engine._applySetting(k, v);
        } catch(e){}
      });
      if(this.scene){
        if(this.hdrTexture){ this.hdrTexture.dispose(); this.hdrTexture = null; }
        this.scene.background = new THREE.Color(TBOX.DATA.COLOR.sky);
        this.scene.environment = null;
        this.hdrEnabled = false;
      }
      this._refreshRenderer();
      console.log('[Engine] 已重新应用所有设置');
    } catch(e){ console.warn('[Engine] _applyAllSettings error:', e); }
  },

  _onResize(){
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    if(this.composer) this.composer.setSize(innerWidth, innerHeight);
    if(this.fxaaPass){
      const pixelRatio = this.renderer.getPixelRatio();
      this.fxaaPass.uniforms['resolution'].value.x = 1 / (innerWidth * pixelRatio);
      this.fxaaPass.uniforms['resolution'].value.y = 1 / (innerHeight * pixelRatio);
    }
  },

  resolvePlayerCollision(p){
    const radius = TBOX.DATA.PLAYER_RADIUS;

    if(this.dummy && this.dummy.alive && this.dummy.group){
      const dx = p.x - this.dummy.group.position.x;
      const dz = p.z - this.dummy.group.position.z;
      const dist = Math.hypot(dx, dz);
      const PUSH = radius + this.dummy.radius;
      if(dist < PUSH && dist > 0.0001){
        p.x += (dx / dist) * (PUSH - dist);
        p.z += (dz / dist) * (PUSH - dist);
      }
    }

    if(TBOX.Corpse && TBOX.Corpse.list){
      for(const c of TBOX.Corpse.list){
        const dx = p.x - c.x, dz = p.z - c.z;
        const dist = Math.hypot(dx, dz);
        const R = 0.6 + radius;
        if(dist < R && dist > 0.0001){
          p.x += (dx / dist) * (R - dist);
          p.z += (dz / dist) * (R - dist);
        }
      }
    }

    if(TBOX.DATA.AABB.enable){
      const maxIter = TBOX.DATA.AABB.maxPushIter || 4;
      for(let iter = 0; iter < maxIter; iter++){
        let pushed = false;
        for(let i = 0; i < this.aabbStatic.length; i++){
          if(this._resolveAABBHorizontal(p, this.aabbStatic[i], radius)) pushed = true;
        }
        for(let i = 0; i < this.aabbDynamic.length; i++){
          if(this._resolveAABBHorizontal(p, this.aabbDynamic[i], radius)) pushed = true;
        }
        if(!pushed) break;
      }
    }
  },

  resolvePlayerGround(p){
    let groundY = 0;
    let onStair = false;
    if(TBOX.DATA.AABB.enable){
      for(let i = 0; i < this.aabbStatic.length; i++){
        const g = this._resolveAABBGround(p, this.aabbStatic[i]);
        if(g > groundY){ groundY = g; onStair = true; }
      }
      for(let i = 0; i < this.aabbDynamic.length; i++){
        const g = this._resolveAABBGround(p, this.aabbDynamic[i]);
        if(g > groundY){ groundY = g; onStair = true; }
      }
    } else {
      for(const s of this.stairs){
        const dx = p.x - s.x, dz = p.z - s.z;
        if(Math.abs(dx) < s.halfW && Math.abs(dz) < s.halfD){
          if(s.topY <= p.y + 0.45 && s.topY > groundY){
            groundY = s.topY;
            onStair = true;
          }
        }
      }
    }
    if(!onStair && groundY < 0) groundY = 0;
    p.onStair = onStair;
    return groundY;
  },

  isPlayerOnStair(){
    const p = TBOX.Player;
    if(!p) return false;
    return p.y > 0.8;
  },

  triggerShake(mag, time){
    const level = TBOX.Save.get('tbox_shake', 'high');
    const mul = TBOX.DATA.SHAKE_LEVEL[level] || 1;
    const amount = TBOX.Save.getNum('tbox_shakeAmount', 100) / 100;
    this.camState.shakeMag = Math.max(this.camState.shakeMag, mag * mul * amount);
    this.camState.shakeTime = Math.max(this.camState.shakeTime, time);
  },

  setViewRoll(roll){ this.camState.viewRoll = roll; },

  updateVitals(dt){
    const p = TBOX.Player;
    if(!p) return;
    const V = TBOX.DATA.VITALS;
    const moveState = p.moveState || 'idle';
    let heartTarget = V.heartIdle;
    if(moveState === 'walk') heartTarget = V.heartWalk;
    else if(moveState === 'run') heartTarget = V.heartRun;
    else if(moveState === 'sprint') heartTarget = V.heartSprint;
    else if(moveState === 'climb') heartTarget = V.heartClimb;
    const hp = p.hp;
    if(hp < 40) heartTarget += V.heartHurtHeavy;
    else if(hp < 70) heartTarget += V.heartHurtMid;
    else if(hp < 90) heartTarget += V.heartHurtLight;
    if(p.stamina < 30) heartTarget += V.heartLowStamina;
    let lungTarget = V.lungIdle;
    if(moveState === 'walk') lungTarget = V.lungWalk;
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
    this.vitals.heartPhase = (this.vitals.heartPhase + dt * (this.vitals.heart / 60)) % 1;
    this.vitals.lungPhase = (this.vitals.lungPhase + dt * (this.vitals.lung / 60)) % 1;
    if(TBOX.UI && TBOX.UI.updateVitals) TBOX.UI.updateVitals(this.vitals, p);
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
    if(hf && this.hurtFx.hitFrameOn){
      this.hurtFx.hitFrameTimer -= rawDt * 1000;
      if(this.hurtFx.hitFrameTimer <= 0){ hf.classList.remove('on'); this.hurtFx.hitFrameOn = false; }
    }
    const blink = document.getElementById('blinkOverlay');
    if(blink){
      const blinkEnabled = TBOX.Save.get('tbox_blinkFx', '1') === '1';
      if(blinkEnabled && hp < TBOX.DATA.VITALS.blinkHp && !p.dead){
        const t = 1 - hp / TBOX.DATA.VITALS.blinkHp;
        const period = TBOX.Utils.lerp(FX.blinkPeriodMax, FX.blinkPeriodMin, t);
        this.hurtFx.blinkTimer += rawDt * 1000;
        if(this.hurtFx.blinkTimer >= period){ this.hurtFx.blinkTimer = 0; this.hurtFx.blinkPhase = 1; }
        if(this.hurtFx.blinkPhase > 0){
          const closeMs = FX.blinkCloseMs;
          const phase = 1 - this.hurtFx.blinkPhase;
          blink.style.opacity = String(1 - Math.abs(phase * 2 - 1));
          this.hurtFx.blinkPhase -= rawDt * 1000 / (closeMs * 2);
          if(this.hurtFx.blinkPhase <= 0){ this.hurtFx.blinkPhase = 0; blink.style.opacity = '0'; }
        } else blink.style.opacity = '0';
      } else blink.style.opacity = '0';
    }
    const slowMoEnabled = TBOX.Save.get('tbox_slowMo', '1') === '1';
    let slowMo = 1.0;
    if(slowMoEnabled && !p.dead){
      if(hp < 10) slowMo = FX.slowMoHp10;
      else if(hp < 20) slowMo = FX.slowMoHp20;
    }
    this.hurtFx.slowMoCurrent = TBOX.Utils.lerp(this.hurtFx.slowMoCurrent, slowMo, Math.min(1, dt * 3));
    const app = document.getElementById('app');
    if(app){
      const desatEnabled = TBOX.Save.get('tbox_desatFx', '1') === '1';
      let blur = 0, desat = 0;
      if(hp < 40){ blur = FX.blurHeavy; if(desatEnabled) desat = FX.desatHeavy; }
      else if(hp < 70){ blur = FX.blurHeavy * 0.5; }
      const newFilter = `blur(${blur.toFixed(2)}px) saturate(${(1 - desat).toFixed(2)})`;
      if(this._lastFilter !== newFilter){
        app.style.filter = newFilter;
        this._lastFilter = newFilter;
      }
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
    let mag = FX.hitShakeMagLight, time = FX.hitShakeTimeLight;
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
      if(TBOX.Audio && TBOX.Audio.playDeath) TBOX.Audio.playDeath();
      if(TBOX.Audio && TBOX.Audio.playTinnitus) TBOX.Audio.playTinnitus();
      this.triggerShake(0.8, 0.6);
    }
    if(!p.dead && this.deathFx.active){
      this.deathFx.active = false;
      this.deathFx.timer = 0;
      this.deathFx.fadeLevel = 0;
      this.deathFx.blinkLevel = 0;
      this.deathFx.dizzyRoll = 0;
      const ds = document.getElementById('deathScreen'); if(ds) ds.style.opacity = '0';
      const hv = document.getElementById('hurtVignette'); if(hv) hv.style.opacity = '0';
      const blink = document.getElementById('blinkOverlay'); if(blink) blink.style.opacity = '0';
    }
    if(!this.deathFx.active) return;
    this.deathFx.timer += dt;
    this.deathFx.dizzyTime += dt;
    const t = this.deathFx.timer;
    if(this.camState.mode === 'fps'){
      const dizzyAmp = D.dizzyRollAmp * Math.max(0, 1 - t / 2.0);
      this.deathFx.dizzyRoll = Math.sin(this.deathFx.dizzyTime * D.dizzySpeed) * dizzyAmp;
    } else this.deathFx.dizzyRoll = 0;
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
      if(ds){ ds.style.display = 'block'; const blackT = Math.min(1, (t - D.blinkEnd) / 0.3); ds.style.opacity = String(blackT); }
    }
  },

  updateCamera(p, character, dt, rawDt){
    const D = TBOX.DATA;
    const headWorld = this._tmpHeadWorld;
    const headQuat = this._tmpHeadQuat;
    if(character && character.head){
      character.head.getWorldPosition(headWorld);
      character.head.getWorldQuaternion(headQuat);
    } else {
      headWorld.set(p.x, p.y + D.EYE_H, p.z);
      headQuat.identity();
    }
    let shX = 0, shY = 0;
    if(this.camState.shakeTime > 0){
      this.camState.shakeTime -= rawDt;
      const k = Math.max(0, this.camState.shakeTime);
      shX = (Math.random() - 0.5) * this.camState.shakeMag * k * 6;
      shY = (Math.random() - 0.5) * this.camState.shakeMag * k * 6;
      if(this.camState.shakeTime <= 0) this.camState.shakeMag = 0;
    }
    const swayEnabled = TBOX.Save.get('tbox_viewSway', '1') === '1';
    let swayX = 0, swayY = 0;
    if(swayEnabled && !p.dead){
      const V = D.VIEW_SWAY;
      const moveState = p.moveState || 'idle';
      let speed = V.speedIdle;
      if(moveState === 'walk') speed = V.speedWalk;
      else if(moveState === 'run') speed = V.speedRun;
      else if(moveState === 'sprint') speed = V.speedSprint;
      this.swayTime += dt * speed;
      const ampMul = (TBOX.Save.getNum('tbox_swayAmount', 100) / 100) * 0.6;
      swayX = Math.sin(this.swayTime) * V.ampX * ampMul;
      swayY = Math.cos(this.swayTime * 1.7) * V.ampY * ampMul;
      const breathPhase = performance.now() / 1000 * V.breathSpeed;
      const breathIntensity = 1.0 * ampMul;
      swayY += Math.sin(breathPhase) * V.breathAmp * breathIntensity;
      swayX += Math.cos(breathPhase * 0.7) * V.breathAmp * 0.4 * breathIntensity;
    }
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
    this.camState.transition = TBOX.Utils.lerp(this.camState.transition, targetTrans, Math.min(1, dt / D.TPS_TRANSITION));
    const inspectCamY = p.inspecting ? (p.inspectCamY || 0) : 0;
    const camFwd = D.CAM_FWD_OFFSET;
    if(p.dead && this.camState.mode === 'fps'){
      const targetX = headWorld.x + shX;
      const targetY = Math.max(0.30, headWorld.y + shY);
      const targetZ = headWorld.z;
      const LAMBDA_POS = 12;
      this.camera.position.x = TBOX.Utils.damp(this.camera.position.x, targetX, LAMBDA_POS, dt);
      this.camera.position.y = TBOX.Utils.damp(this.camera.position.y, targetY, LAMBDA_POS, dt);
      this.camera.position.z = TBOX.Utils.damp(this.camera.position.z, targetZ, LAMBDA_POS, dt);
      this._tmpShadowQuat.copy(headQuat);
      this._tmpEuler.setFromQuaternion(this._tmpShadowQuat, 'YXZ');
      this._tmpEuler.z += this.deathFx.dizzyRoll;
      this._tmpEuler.x += shX * 0.05;
      this._tmpEuler.y += shY * 0.05;
      this._tmpShadowQuat.setFromEuler(this._tmpEuler);
      const t = Math.min(1, dt * 10);
      this.camera.quaternion.slerp(this._tmpShadowQuat, t);
      return;
    }
    if(p.dead && this.camState.mode === 'tps'){
      const tpsDist = TBOX.Save.getNum('tbox_tpsDist', 45) / 10;
      const tpsH = TBOX.Save.getNum('tbox_tpsH', 16) / 10;
      const backX = Math.sin(this.camState.yaw);
      const backZ = Math.cos(this.camState.yaw);
      const targetX = headWorld.x + backX * tpsDist;
      const targetY = headWorld.y + tpsH + 0.6;
      const targetZ = headWorld.z + backZ * tpsDist;
      const LAMBDA_POS = 5;
      this.camera.position.x = TBOX.Utils.damp(this.camera.position.x, targetX, LAMBDA_POS, dt);
      this.camera.position.y = TBOX.Utils.damp(this.camera.position.y, targetY, LAMBDA_POS, dt);
      this.camera.position.z = TBOX.Utils.damp(this.camera.position.z, targetZ, LAMBDA_POS, dt);
      this._tmpLookAt.copy(headWorld);
      this.camera.lookAt(this._tmpLookAt);
      return;
    }
    if(this.camState.transition < 0.001){
      this.camera.position.set(
        headWorld.x + shX + fwdX * camFwd,
        headWorld.y + shY + inspectCamY,
        headWorld.z + fwdZ * camFwd
      );
    } else {
      const tpsDist = TBOX.Save.getNum('tbox_tpsDist', 45) / 10;
      const tpsH = TBOX.Save.getNum('tbox_tpsH', 16) / 10;
      const backX = Math.sin(this.camState.yaw);
      const backZ = Math.cos(this.camState.yaw);
      const tpsX = p.x + backX * tpsDist;
      const tpsY = headWorld.y + tpsH;
      const tpsZ = p.z + backZ * tpsDist;
      const safeY = Math.max(0.40, tpsY);
      const fpsX = headWorld.x + shX + fwdX * camFwd;
      const fpsY = headWorld.y + shY + inspectCamY;
      const fpsZ = headWorld.z + fwdZ * camFwd;
      const t = this.camState.transition;
      this.camera.position.set(
        TBOX.Utils.lerp(fpsX, tpsX, t),
        TBOX.Utils.lerp(fpsY, safeY, t),
        TBOX.Utils.lerp(fpsZ, tpsZ, t)
      );
    }
    if(this.camera.position.y < 0.30) this.camera.position.y = 0.30;
    const rollActive = p.dodging || p.knockedDown;
    if(!rollActive && Math.abs(this.camState.viewRoll) > 0.001){
      this.camState.viewRoll = TBOX.Utils.lerp(this.camState.viewRoll, 0, Math.min(1, dt * 10));
      if(Math.abs(this.camState.viewRoll) < 0.001) this.camState.viewRoll = 0;
    } else if(rollActive){
      const MAX = 0.25;
      this.camState.viewRoll = TBOX.Utils.clamp(this.camState.viewRoll, -MAX, MAX);
    }
    const viewShakeX = (Math.random() - 0.5) * p.camKick * 0.5;
    const viewShakeY = (Math.random() - 0.5) * p.camKick * 0.5;
    const totalYaw = this.camState.yaw + viewShakeX + swayX + runShakeX;
    const totalPitch = this.camState.pitch + viewShakeY + swayY + runShakeY;
    this.camera.rotation.set(totalPitch, totalYaw, this.camState.viewRoll, 'YXZ');
    if(character && character.head && character.head.material){
      const hm = character.head.material;
      if(Array.isArray(hm)) hm.forEach(function(m){ m.opacity = TBOX.Engine.camState.transition * 0.85; });
      else hm.opacity = this.camState.transition * 0.85;
    }
    const baseFov = TBOX.Save.getNum('tbox_fov', 120);
    const attackFov = (p.attackTimer > 0 && ['leftKick','rightKick','knee','push'].includes(p.attackType)) ? 4 : 0;
    p.fovKick = TBOX.Utils.lerp(p.fovKick, 0, Math.min(1, rawDt * 12));
    const targetFov = baseFov + p.fovKick + attackFov;
    if(Math.abs(this.camera.fov - targetFov) > 0.01){
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  },

  updateCrosshairSpread(dt){
    if(!TBOX.UI || !TBOX.UI.setCrosshairSpread) return;
    var p = TBOX.Player;
    if(!p) return;
    var target = 0;
    if(p.speedFactor > 0.1) target += Math.min(0.5, p.speedFactor * 0.5);
    if(p.attackTimer > 0) target += 0.7;
    if(!p.onGround) target += 0.4;
    var lambda = 10;
    this._chSpreadCurrent = TBOX.Utils.damp(this._chSpreadCurrent, target, lambda, dt);
    TBOX.UI.setCrosshairSpread(this._chSpreadCurrent);
  },

  toggleView(){
    this.camState.mode = this.camState.mode === 'fps' ? 'tps' : 'fps';
    TBOX.UI.updateMode(this.camState.mode);
    TBOX.Events.emit(TBOX.EVENTS.CAM_SWITCH, this.camState.mode);
  },

  /* ============================================================
   * 物理系统
   * ============================================================ */
  updatePhysics(dt){
    const P = TBOX.DATA.PHYSICS;
    if(!P.enable) return;
    const props = this.props;
    const grab = this.grabbedProp;

    for(let i = 0; i < props.length; i++){
      const obj = props[i];
      if(!obj.mesh) continue;
      if(obj === grab) continue;

      const phy = obj.phy;
      if(!phy || phy.sleeping) continue;

      /* 重力 */
      phy.vy += P.gravity * dt;

      /* 摩擦 */
      const friction = phy.onGround ? P.friction : P.airFriction;
      const fr = Math.max(0, 1 - friction * dt);
      phy.vx *= fr;
      phy.vz *= fr;

      /* 位置 */
      obj.mesh.position.x += phy.vx * dt;
      obj.mesh.position.y += phy.vy * dt;
      obj.mesh.position.z += phy.vz * dt;

      /* 地面 / 台阶 */
      if(P.collideStairs) this._resolvePropGround(obj, dt);

      /* 物体间碰撞 */
      if(P.propCollision) this._resolvePropVsProps(obj, i);

      /* 玩家推 */
      if(P.playerPush) this._resolvePropVsPlayer(obj, dt);

      /* AABB 同步 */
      obj.box.x = obj.mesh.position.x;
      obj.box.y = obj.mesh.position.y;
      obj.box.z = obj.mesh.position.z;
      obj.box.topY = obj.mesh.position.y + obj.size.y / 2;
      obj.box.bottomY = obj.mesh.position.y - obj.size.y / 2;

      /* 睡眠判定 */
      const speed = Math.hypot(phy.vx, phy.vy, phy.vz);
      if(speed < P.sleepSpeed && phy.onGround){
        phy.sleepTimer += dt;
        if(phy.sleepTimer > P.sleepTime){
          phy.sleeping = true;
          phy.vx = 0; phy.vy = 0; phy.vz = 0;
        }
      } else {
        phy.sleepTimer = 0;
      }
    }

    /* 超过最大数量，删除最早的 */
    while(this.props.length > P.maxProps){
      this.deleteProp(this.props[0]);
    }
  },

  _resolvePropGround(obj, dt){
    const P = TBOX.DATA.PHYSICS;
    const pos = obj.mesh.position;
    const halfH = obj.size.y / 2;

    let groundY = 0;
    /* 台阶 */
    for(let i = 0; i < this.aabbStatic.length; i++){
      const box = this.aabbStatic[i];
      if(box.tag === 'prop') continue;
      const dx = pos.x - box.x;
      const dz = pos.z - box.z;
      if(Math.abs(dx) < box.hw + obj.size.x / 2 && Math.abs(dz) < box.hd + obj.size.z / 2){
        if(box.topY > groundY && pos.y - halfH < box.topY) groundY = box.topY;
      }
    }

    /* 地面 */
    if(pos.y - halfH < groundY){
      pos.y = groundY + halfH;
      if(obj.phy.vy < 0){
        obj.phy.vy = -obj.phy.vy * P.restitution;
        if(Math.abs(obj.phy.vy) < 0.5) obj.phy.vy = 0;
      }
      obj.phy.onGround = true;
    } else {
      obj.phy.onGround = false;
    }
  },

  _resolvePropVsProps(obj, myIdx){
    const P = TBOX.DATA.PHYSICS;
    const pos = obj.mesh.position;
    for(let j = 0; j < this.props.length; j++){
      if(j === myIdx) continue;
      const other = this.props[j];
      if(!other.mesh) continue;
      const op = other.mesh.position;
      const dx = pos.x - op.x;
      const dz = pos.z - op.z;
      const dy = pos.y - op.y;
      const rx = (obj.size.x + other.size.x) / 2;
      const rz = (obj.size.z + other.size.z) / 2;
      const ry = (obj.size.y + other.size.y) / 2;
      if(Math.abs(dx) < rx && Math.abs(dz) < rz && Math.abs(dy) < ry){
        /* 水平推出 */
        const overlapX = rx - Math.abs(dx);
        const overlapZ = rz - Math.abs(dz);
        if(overlapX < overlapZ){
          const sign = dx > 0 ? 1 : -1;
          pos.x += sign * overlapX * 0.5;
          other.mesh.position.x -= sign * overlapX * 0.5;
          const v = obj.phy.vx;
          obj.phy.vx = other.phy.vx * 0.5;
          other.phy.vx = v * 0.5;
        } else {
          const sign = dz > 0 ? 1 : -1;
          pos.z += sign * overlapZ * 0.5;
          other.mesh.position.z -= sign * overlapZ * 0.5;
          const v = obj.phy.vz;
          obj.phy.vz = other.phy.vz * 0.5;
          other.phy.vz = v * 0.5;
        }
        /* 垂直 */
        if(Math.abs(dy) > 0.01){
          const overlapY = ry - Math.abs(dy);
          const sign = dy > 0 ? 1 : -1;
          pos.y += sign * overlapY * 0.5;
          other.mesh.position.y -= sign * overlapY * 0.5;
        }
        obj.phy.sleeping = false;
        other.phy.sleeping = false;
      }
    }
  },

  _resolvePropVsPlayer(obj, dt){
    const p = TBOX.Player;
    if(!p) return;
    const pos = obj.mesh.position;
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const dist = Math.hypot(dx, dz);
    const rad = TBOX.DATA.PLAYER_RADIUS + Math.max(obj.size.x, obj.size.z) / 2;
    if(dist < rad && dist > 0.0001){
      const nx = dx / dist;
      const nz = dz / dist;
      /* 推出 */
      const overlap = rad - dist;
      pos.x += nx * overlap;
      pos.z += nz * overlap;
      /* 给速度（玩家推） */
      const P = TBOX.DATA.PHYSICS;
      const pushForce = P.playerPushForce * (p.speedFactor > 0.1 ? 1.5 : 0.5);
      obj.phy.vx += nx * pushForce * dt * 10;
      obj.phy.vz += nz * pushForce * dt * 10;
      obj.phy.sleeping = false;
      /* AABB 同步 */
      obj.box.x = pos.x;
      obj.box.z = pos.z;
    }
  },

  /* ============================================================
   * 抓取系统
   * ============================================================ */
  grabProp(){
    const G = TBOX.DATA.GRAB;
    if(!G.enable) return false;
    if(this.grabbedProp) return false;
    const cam = this.camera;
    if(!cam) return false;

    /* 从相机位置沿视线方向射线 */
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);

    let best = null;
    let bestT = G.range;
    for(let i = 0; i < this.props.length; i++){
      const obj = this.props[i];
      if(!obj.mesh) continue;
      const toObj = new THREE.Vector3().subVectors(obj.mesh.position, origin);
      const t = toObj.dot(dir);
      if(t < 0 || t > G.range) continue;
      const closest = new THREE.Vector3().copy(origin).add(dir.clone().multiplyScalar(t));
      const d = closest.distanceTo(obj.mesh.position);
      const r = Math.max(obj.size.x, obj.size.y, obj.size.z) / 2;
      if(d < r && t < bestT){
        bestT = t;
        best = obj;
      }
    }

    if(!best) return false;
    this.grabbedProp = best;
    best.phy.sleeping = false;
    /* 计算抓取距离：物体到相机 */
    this.grabDist = best.mesh.position.distanceTo(origin);
    return true;
  },

  releaseProp(){
    if(!this.grabbedProp) return false;
    this.grabbedProp.phy.sleeping = false;
    this.grabbedProp = null;
    this.grabDist = 0;
    return true;
  },

  throwProp(){
    const G = TBOX.DATA.GRAB;
    if(!this.grabbedProp) return false;
    const obj = this.grabbedProp;
    const cam = this.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    obj.phy.vx = dir.x * G.throwSpeed;
    obj.phy.vy = dir.y * G.throwSpeed + 2;
    obj.phy.vz = dir.z * G.throwSpeed;
    obj.phy.sleeping = false;
    this.grabbedProp = null;
    this.grabDist = 0;
    return true;
  },

  updateGrab(dt){
    const G = TBOX.DATA.GRAB;
    if(!G.enable) return;
    const obj = this.grabbedProp;
    if(!obj || !obj.mesh) return;
    const cam = this.camera;
    if(!cam) return;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const targetPos = new THREE.Vector3().copy(origin).add(dir.clone().multiplyScalar(G.holdDistance));
    /* 平滑跟随 */
    const lam = TBOX.DATA.PHYSICS.grabFollowLambda;
    const k = 1 - Math.exp(-lam * dt);
    obj.mesh.position.lerp(targetPos, k);
    obj.phy.vx = 0; obj.phy.vy = 0; obj.phy.vz = 0;
    obj.phy.sleeping = false;
    obj.box.x = obj.mesh.position.x;
    obj.box.y = obj.mesh.position.y;
    obj.box.z = obj.mesh.position.z;
    obj.box.topY = obj.mesh.position.y + obj.size.y / 2;
    obj.box.bottomY = obj.mesh.position.y - obj.size.y / 2;
  },

  /* ============================================================
   * 启动 / 循环
   * ============================================================ */
  start(){
    this.running = true; this.paused = false;
    this.lastTime = performance.now();
    if(!this.isTouch && this.controls){ try { this.controls.lock(); } catch(e){} }
    this._startAmbient();
    requestAnimationFrame((now) => this.loop(now));
  },

  _startAmbient(){
    if(TBOX.Audio && TBOX.Audio.startAmbient) TBOX.Audio.startAmbient();
  },

  requestLock(){
    if(this.isTouch) return;
    if(this.controls && !this.controls.isLocked){ try { this.controls.lock(); } catch(e){} }
  },

  pause(){ this.paused = true; },
  resume(){ this.paused = false; this.lastTime = performance.now(); },

  loop(now){
    requestAnimationFrame((t) => this.loop(t));
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    if(!isFinite(rawDt) || rawDt <= 0){ this._render(); return; }
    const fpsLimit = TBOX.Save.getNum('tbox_fpsLimit', 60);
    if(fpsLimit > 0 && fpsLimit < 240){
      const minFrameTime = 1000 / fpsLimit;
      if(now - (this._lastFrameTime || 0) < minFrameTime) return;
      this._lastFrameTime = now;
    }
    let timeScale = 1.0;
    if(TBOX.Save.get('tbox_slowMo', '1') === '1' && this.player && !this.player.dead){
      timeScale *= this.hurtFx.slowMoCurrent;
    }
    const dt = rawDt * timeScale;
    if(this.paused){ this._render(); return; }
    this.fpsAcc += rawDt; this.fpsFrames++;
    if(this.fpsAcc >= 0.5){
      this.fpsValue = Math.round(this.fpsFrames / this.fpsAcc);
      if(this.player && TBOX.Save.get('tbox_showfps', 'off') === 'on') TBOX.UI.updateFPS(this.fpsValue);
      if(this.player && TBOX.Save.get('tbox_showCoord', '0') === '1') TBOX.UI.updateCoord(this.player);
      this.fpsAcc = 0; this.fpsFrames = 0;
    }
    let hitStopDt = dt;
    if(this.player && this.player.hitStop > 0){
      this.player.hitStop -= rawDt;
      hitStopDt = dt * 0.15;
    }
    if(this.onUpdate) this.onUpdate(hitStopDt, now);
    if(this.onUpdateAction) this.onUpdateAction(hitStopDt, now);
    TBOX.Action.updateEnemyPose(hitStopDt, now);
    this.updateVitals(dt);
    this.updateHurtFx(dt, rawDt);
    this.updateDeathFx(dt, rawDt);
    if(this.player && this.character) this.updateCamera(this.player, this.character, dt, rawDt);

    /* ★ 物理 / 抓取 */
    this.updatePhysics(dt);
    this.updateGrab(dt);

    if(this.onUpdateFragments) this.onUpdateFragments(rawDt);
    this.updateCrosshairSpread(dt);
    TBOX.UI.updateCompass(this.camState.yaw);
    TBOX.UI.updateHurtVignette(this.player);
    TBOX.UI.updateHpHud(this.player);
    if(this.csm && this.csmEnabled) this.csm.update();
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    if(shadowOn && !this.csmEnabled){
      this.shadowTick = (this.shadowTick + 1) % this.Q.shadowTick;
      if(this.shadowTick === 0 && this.player){
        this.sunLight.position.set(this.player.x + 24, 46, this.player.z + 18);
        this.sunLight.target.position.set(this.player.x, 0, this.player.z);
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this._render();
  },

  _render(){
    var t = performance.now() / 1000;
    if(this.filmGrainPass && this.filmGrainPass.enabled){
      this.filmGrainPass.uniforms.time.value = t;
    }
    if(this.motionBlurPass && this.motionBlurPass.enabled){
      this.motionBlurPass.uniforms.time.value = t;
      var p = TBOX.Player;
      if(p){
        var sp = p.speedFactor || 0;
        this.motionBlurPass.uniforms.intensity.value = 0.2 + sp * 0.8;
      }
    }
    if(this.postProcessingEnabled && this.composer){
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  },

  /* ============================================================
   * 90 个独立几何体
   * ============================================================ */
  _geoDispatch(id, s){
    switch(id){
      case 'cube':            return this._geo_cube(s);
      case 'cuboid':          return this._geo_cuboid(s);
      case 'tetrahedron':     return this._geo_tetrahedron(s);
      case 'octahedron':      return this._geo_octahedron(s);
      case 'dodecahedron':    return this._geo_dodecahedron(s);
      case 'icosahedron':     return this._geo_icosahedron(s);
      case 'sphere':          return this._geo_sphere(s);
      case 'hemisphere':      return this._geo_hemisphere(s);
      case 'quarter-sphere':  return this._geo_quarter_sphere(s);
      case 'capsule':         return this._geo_capsule(s);
      case 'prism3':          return this._geo_prism(s, 3);
      case 'prism4':          return this._geo_prism(s, 4);
      case 'prism5':          return this._geo_prism(s, 5);
      case 'prism6':          return this._geo_prism(s, 6);
      case 'prism8':          return this._geo_prism(s, 8);
      case 'prism12':         return this._geo_prism(s, 12);
      case 'prism16':         return this._geo_prism(s, 16);
      case 'pyramid3':        return this._geo_pyramid(s, 3);
      case 'pyramid4':        return this._geo_pyramid(s, 4);
      case 'pyramid5':        return this._geo_pyramid(s, 5);
      case 'pyramid6':        return this._geo_pyramid(s, 6);
      case 'pyramid8':        return this._geo_pyramid(s, 8);
      case 'pyramid12':       return this._geo_pyramid(s, 12);
      case 'pyramid16':       return this._geo_pyramid(s, 16);
      case 'cylinder':        return this._geo_cylinder(s);
      case 'cylinder-hollow': return this._geo_cylinder_hollow(s);
      case 'cone':            return this._geo_cone(s);
      case 'cone-truncated':  return this._geo_cone_truncated(s);
      case 'disc':            return this._geo_disc(s, 0.08);
      case 'disc-thick':      return this._geo_disc(s, 0.35);
      case 'disc-hollow':     return this._geo_disc_hollow(s);
      case 'torus':           return this._geo_torus(s, 0.20);
      case 'torus-thick':     return this._geo_torus(s, 0.35);
      case 'torus-half':      return this._geo_torus_half(s);
      case 'wedge':           return this._geo_wedge(s);
      case 'wedge-curved':    return this._geo_wedge_curved(s);
      case 'ramp':            return this._geo_ramp(s);
      case 'ramp-curved':     return this._geo_ramp_curved(s);
      case 'step':            return this._geo_step(s);
      case 'stair':           return this._geo_stair(s);
      case 'stair-spiral':    return this._geo_stair_spiral(s);
      case 'arch':            return this._geo_arch(s, false);
      case 'arch-half':       return this._geo_arch(s, true);
      case 'cross':           return this._geo_cross(s);
      case 'star3':           return this._geo_star(s, 3);
      case 'star4':           return this._geo_star(s, 4);
      case 'star5':           return this._geo_star(s, 5);
      case 'star6':           return this._geo_star(s, 6);
      case 'star8':           return this._geo_star(s, 8);
      case 'ring':            return this._geo_ring(s);
      case 'ring-square':     return this._geo_ring_square(s);
      case 'L-shape':         return this._geo_L(s);
      case 'T-shape':         return this._geo_T(s);
      case 'U-shape':         return this._geo_U(s);
      case 'H-shape':         return this._geo_H(s);
      case 'I-shape':         return this._geo_I(s);
      case 'plus':            return this._geo_plus(s);
      case 'minus':           return this._geo_minus(s);
      case 'slash':           return this._geo_slash(s);
      case 'backslash':       return this._geo_backslash(s);
      case 'plate-square':    return this._geo_plate(s, 1.0, 1.0);
      case 'plate-rect':      return this._geo_plate(s, 2.0, 1.0);
      case 'plate-tri':       return this._geo_plate_tri(s);
      case 'plate-hex':       return this._geo_plate_poly(s, 6);
      case 'plate-oct':       return this._geo_plate_poly(s, 8);
      case 'plate-circle':    return this._geo_plate_circle(s);
      case 'plate-ring':      return this._geo_plate_ring(s);
      case 'plate-star':      return this._geo_plate_star(s);
      case 'rod':             return this._geo_rod(s, 0);
      case 'rod-square':      return this._geo_rod(s, 4);
      case 'rod-hex':         return this._geo_rod(s, 6);
      case 'tube':            return this._geo_tube(s, 0);
      case 'tube-square':     return this._geo_tube(s, 4);
      case 'tube-hex':        return this._geo_tube(s, 6);
      case 'frame':           return this._geo_frame(s, 0);
      case 'frame-square':    return this._geo_frame(s, 4);
      case 'frame-circle':    return this._geo_frame(s, 12);
      case 'gear':            return this._geo_gear(s, 12, 0.2);
      case 'gear-thick':      return this._geo_gear(s, 16, 0.35);
      case 'wheel':           return this._geo_wheel(s, false);
      case 'wheel-spoke':     return this._geo_wheel(s, true);
      case 'bar':             return this._geo_bar(s);
      case 'bar-curved':      return this._geo_bar_curved(s);
      case 'beam':            return this._geo_beam(s);
      case 'beam-curved':     return this._geo_beam_curved(s);
      case 'panel':           return this._geo_panel(s);
      case 'panel-curved':    return this._geo_panel_curved(s);
      case 'bracket':         return this._geo_bracket(s, 0);
      case 'bracket-L':       return this._geo_bracket(s, 1);
      case 'bracket-T':       return this._geo_bracket(s, 2);
      default:                return new THREE.BoxGeometry(s, s, s);
    }
  },

  _geo_cube(s){ return new THREE.BoxGeometry(s, s, s); },
  _geo_cuboid(s){ return new THREE.BoxGeometry(s * 1.6, s * 0.8, s); },
  _geo_tetrahedron(s){ return new THREE.TetrahedronGeometry(s * 0.8, 0); },
  _geo_octahedron(s){ return new THREE.OctahedronGeometry(s * 0.8, 0); },
  _geo_dodecahedron(s){ return new THREE.DodecahedronGeometry(s * 0.75, 0); },
  _geo_icosahedron(s){ return new THREE.IcosahedronGeometry(s * 0.8, 0); },
  _geo_sphere(s){ return new THREE.SphereGeometry(s * 0.5, 16, 12); },
  _geo_hemisphere(s){ return new THREE.SphereGeometry(s * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2); },
  _geo_quarter_sphere(s){ return new THREE.SphereGeometry(s * 0.5, 16, 12, 0, Math.PI / 2, 0, Math.PI / 2); },
  _geo_capsule(s){ return new THREE.CapsuleGeometry(s * 0.35, s * 0.6, 6, 12); },

  _geo_prism(s, n){ return new THREE.CylinderGeometry(s * 0.5, s * 0.5, s, n); },
  _geo_pyramid(s, n){ return new THREE.ConeGeometry(s * 0.5, s, n); },

  _geo_cylinder(s){ return new THREE.CylinderGeometry(s * 0.5, s * 0.5, s, 24); },
  _geo_cylinder_hollow(s){ return new THREE.CylinderGeometry(s * 0.5, s * 0.5, s, 24, 1, true); },
  _geo_cone(s){ return new THREE.ConeGeometry(s * 0.5, s, 24); },
  _geo_cone_truncated(s){ return new THREE.CylinderGeometry(s * 0.3, s * 0.5, s, 24); },

  _geo_disc(s, h){ return new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * h, 32); },
  _geo_disc_hollow(s){ return new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * 0.15, 32, 1, true); },
  _geo_torus(s, tube){ return new THREE.TorusGeometry(s * 0.5, s * tube, 12, 32); },
  _geo_torus_half(s){ return new THREE.TorusGeometry(s * 0.5, s * 0.2, 12, 32, Math.PI); },

  _geo_wedge(s){
    const v = new Float32Array([
      0, 0, 0,  s, 0, 0,  s, 0, s,
      0, 0, 0,  s, 0, s,  0, 0, s,
      0, 0, 0,  0, 0, s,  0, s, s,
      0, 0, 0,  0, s, s,  0, s, 0,
      0, 0, 0,  0, s, 0,  s, 0, 0,
      s, 0, 0,  0, s, 0,  s, 0, s,
      0, 0, s,  s, 0, s,  0, s, s
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_wedge_curved(s){
    const v = [];
    const seg = 10;
    for(let i = 0; i < seg; i++){
      const t0 = i / seg;
      const t1 = (i + 1) / seg;
      const x0 = t0 * s;
      const x1 = t1 * s;
      const y0 = Math.sin(t0 * Math.PI / 2) * s * 0.5;
      const y1 = Math.sin(t1 * Math.PI / 2) * s * 0.5;
      v.push(x0, 0, 0, x1, 0, 0, x1, y1, 0);
      v.push(x0, 0, 0, x1, y1, 0, x0, y0, 0);
      v.push(x0, 0, 0, x1, 0, 0, x1, 0, s);
      v.push(x0, 0, 0, x1, 0, s, x0, 0, s);
      v.push(x0, 0, s, x1, 0, s, x1, y1, s);
      v.push(x0, 0, s, x1, y1, s, x0, y0, s);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_ramp(s){
    const v = new Float32Array([
      0, 0, 0,  s, 0, 0,  s, s, 0,
      0, 0, 0,  s, s, 0,  0, 0, 0,
      0, 0, 0,  0, 0, s,  s, 0, s,
      0, 0, 0,  s, 0, s,  s, 0, 0,
      s, 0, 0,  s, 0, s,  s, s, s,
      s, 0, 0,  s, s, s,  s, s, 0,
      0, 0, s,  0, 0, 0,  0, s, 0,
      0, 0, s,  0, s, 0,  0, s, s
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_ramp_curved(s){
    const v = [];
    const seg = 10;
    for(let i = 0; i < seg; i++){
      const t0 = i / seg;
      const t1 = (i + 1) / seg;
      const x0 = t0 * s;
      const x1 = t1 * s;
      const y0 = Math.sin(t0 * Math.PI / 2) * s;
      const y1 = Math.sin(t1 * Math.PI / 2) * s;
      v.push(x0, y0, 0, x1, y1, 0, x1, 0, 0);
      v.push(x0, y0, 0, x1, 0, 0, x0, 0, 0);
      v.push(x0, 0, 0, x1, 0, 0, x1, 0, s);
      v.push(x0, 0, 0, x1, 0, s, x0, 0, s);
      v.push(x0, 0, s, x1, 0, s, x1, y1, s);
      v.push(x0, 0, s, x1, y1, s, x0, y0, s);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_step(s){
    const v = new Float32Array([
      0,0,0,  s,0,0,  s,s,0,
      0,0,0,  s,s,0,  0,s,0,
      0,0,s,  s,0,s,  s,0,0,
      0,0,s,  s,0,0,  0,0,0,
      0,s,0,  s,s,0,  s,s/2,s,
      0,s,0,  s,s/2,s, 0,s/2,s,
      0,s/2,s, s,s/2,s, s,s,s,
      0,s/2,s, s,s,s, 0,s,s,
      0,0,s,  0,s/2,s, 0,s,s,
      s,0,s,  s,s,s,  s,s/2,s,
      s,0,s,  s,s/2,s, s,0,0
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_stair(s){
    const v = [];
    const steps = 5;
    const stepH = s / steps;
    const stepD = s / steps;
    for(let i = 0; i < steps; i++){
      const y = stepH * (i + 1);
      const z = stepD * i;
      v.push(0, y, z, s, y, z, s, y, z + stepD);
      v.push(0, y, z, s, y, z + stepD, 0, y, z + stepD);
      v.push(0, 0, z + stepD, s, 0, z + stepD, s, y, z + stepD);
      v.push(0, 0, z + stepD, s, y, z + stepD, 0, y, z + stepD);
      v.push(0, y, z + stepD, 0, y, z, 0, 0, z);
      v.push(s, y, z + stepD, s, y, z, s, 0, z);
      v.push(0, 0, z, s, 0, z, s, 0, z + stepD);
      v.push(0, 0, z, s, 0, z + stepD, 0, 0, z + stepD);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  },

  _geo_stair_spiral(s){
    const pts = [];
    for(let i = 0; i <= 16; i++){
      const t = i / 16;
      const a = t * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * s * 0.4, t * s, Math.sin(a) * s * 0.4));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 32, s * 0.1, 8, false);
  },

  _geo_arch(s, half){
    return new THREE.TorusGeometry(s * 0.5, s * 0.15, 10, 24, half ? Math.PI / 2 : Math.PI);
  },

  _geo_cross(s){
    const g1 = new THREE.BoxGeometry(s * 0.35, s, s * 0.35);
    const g2 = new THREE.BoxGeometry(s, s * 0.35, s * 0.35);
    return this._mergeGeos([g1, g2], [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }]);
  },

  _geo_star(s, n){
    const shape = new THREE.Shape();
    for(let i = 0; i < n * 2; i++){
      const a = -Math.PI / 2 + i * Math.PI / n;
      const r = (i % 2 === 0) ? s * 0.5 : s * 0.2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if(i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.2, bevelEnabled: false });
  },

  _geo_ring(s){ return new THREE.TorusGeometry(s * 0.5, s * 0.15, 12, 32); },

  _geo_ring_square(s){
    const shape = new THREE.Shape();
    const o = s * 0.5;
    shape.moveTo(-o, -o);
    shape.lineTo(o, -o);
    shape.lineTo(o, o);
    shape.lineTo(-o, o);
    shape.closePath();
    const hole = new THREE.Path();
    const hi = s * 0.25;
    hole.moveTo(-hi, -hi);
    hole.lineTo(-hi, hi);
    hole.lineTo(hi, hi);
    hole.lineTo(hi, -hi);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.15, bevelEnabled: false });
  },

  _geo_L(s){
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(s * 0.4, 0);
    shape.lineTo(s * 0.4, s * 0.6);
    shape.lineTo(s, s * 0.6);
    shape.lineTo(s, s);
    shape.lineTo(0, s);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.3, bevelEnabled: false });
  },

  _geo_T(s){
    const g1 = new THREE.BoxGeometry(s, s * 0.35, s * 0.3);
    const g2 = new THREE.BoxGeometry(s * 0.35, s * 0.65, s * 0.3);
    return this._mergeGeos([g1, g2], [{ x: 0, y: s * 0.325, z: 0 }, { x: 0, y: -s * 0.175, z: 0 }]);
  },

  _geo_U(s){
    const g1 = new THREE.BoxGeometry(s, s * 0.3, s * 0.3);
    const g2 = new THREE.BoxGeometry(s * 0.3, s * 0.7, s * 0.3);
    const g3 = new THREE.BoxGeometry(s * 0.3, s * 0.7, s * 0.3);
    return this._mergeGeos([g1, g2, g3], [
      { x: 0, y: -s * 0.35, z: 0 },
      { x: -s * 0.35, y: s * 0.15, z: 0 },
      { x: s * 0.35, y: s * 0.15, z: 0 }
    ]);
  },

  _geo_H(s){
    const g1 = new THREE.BoxGeometry(s * 0.3, s, s * 0.3);
    const g2 = new THREE.BoxGeometry(s * 0.3, s, s * 0.3);
    const g3 = new THREE.BoxGeometry(s * 0.4, s * 0.3, s * 0.3);
    return this._mergeGeos([g1, g2, g3], [
      { x: -s * 0.35, y: 0, z: 0 },
      { x: s * 0.35, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]);
  },

  _geo_I(s){
    const g1 = new THREE.BoxGeometry(s, s * 0.25, s * 0.3);
    const g2 = new THREE.BoxGeometry(s * 0.35, s * 0.5, s * 0.3);
    const g3 = new THREE.BoxGeometry(s, s * 0.25, s * 0.3);
    return this._mergeGeos([g1, g2, g3], [
      { x: 0, y: s * 0.375, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: -s * 0.375, z: 0 }
    ]);
  },

  _geo_plus(s){
    const g1 = new THREE.BoxGeometry(s * 0.35, s, s * 0.3);
    const g2 = new THREE.BoxGeometry(s, s * 0.35, s * 0.3);
    return this._mergeGeos([g1, g2], [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }]);
  },

  _geo_minus(s){ return new THREE.BoxGeometry(s, s * 0.35, s * 0.3); },

  _geo_slash(s){
    const g = new THREE.BoxGeometry(s, s * 0.2, s * 0.2);
    g.rotateZ(Math.PI / 4);
    return g;
  },

  _geo_backslash(s){
    const g = new THREE.BoxGeometry(s, s * 0.2, s * 0.2);
    g.rotateZ(-Math.PI / 4);
    return g;
  },

  _geo_plate(s, mulW, mulH){ return new THREE.BoxGeometry(s * mulW, s * 0.1, s * mulH); },

  _geo_plate_tri(s){
    const shape = new THREE.Shape();
    shape.moveTo(-s * 0.5, -s * 0.5);
    shape.lineTo(s * 0.5, -s * 0.5);
    shape.lineTo(0, s * 0.5);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.1, bevelEnabled: false });
  },

  _geo_plate_poly(s, n){
    const shape = new THREE.Shape();
    for(let i = 0; i < n; i++){
      const a = i * 2 * Math.PI / n;
      const x = Math.cos(a) * s * 0.5;
      const y = Math.sin(a) * s * 0.5;
      if(i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.1, bevelEnabled: false });
  },

  _geo_plate_circle(s){ return new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 0.1, 32); },

  _geo_plate_ring(s){
    const shape = new THREE.Shape();
    shape.absarc(0, 0, s * 0.5, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, s * 0.25, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.1, bevelEnabled: false });
  },

  _geo_plate_star(s){
    const shape = new THREE.Shape();
    for(let i = 0; i < 10; i++){
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = (i % 2 === 0) ? s * 0.5 : s * 0.2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if(i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.1, bevelEnabled: false });
  },

  _geo_rod(s, sides){
    if(sides === 0) return new THREE.CylinderGeometry(s * 0.15, s * 0.15, s, 12);
    return new THREE.CylinderGeometry(s * 0.15, s * 0.15, s, sides);
  },

  _geo_tube(s, sides){
    if(sides === 0) return new THREE.CylinderGeometry(s * 0.2, s * 0.2, s, 16, 1, true);
    return new THREE.CylinderGeometry(s * 0.2, s * 0.2, s, sides, 1, true);
  },

  _geo_frame(s, sides){
    if(sides === 0){
      const g1 = new THREE.BoxGeometry(s, s * 0.1, s * 0.1);
      const g2 = new THREE.BoxGeometry(s, s * 0.1, s * 0.1);
      const g3 = new THREE.BoxGeometry(s * 0.1, s * 0.8, s * 0.1);
      const g4 = new THREE.BoxGeometry(s * 0.1, s * 0.8, s * 0.1);
      return this._mergeGeos([g1, g2, g3, g4], [
        { x: 0, y: s * 0.45, z: 0 },
        { x: 0, y: -s * 0.45, z: 0 },
        { x: -s * 0.45, y: 0, z: 0 },
        { x: s * 0.45, y: 0, z: 0 }
      ]);
    }
    return new THREE.TorusGeometry(s * 0.5, s * 0.08, 8, 24);
  },

  _geo_gear(s, teeth, tube){
    const shape = new THREE.Shape();
    for(let i = 0; i < teeth * 2; i++){
      const a = -Math.PI / 2 + i * Math.PI / teeth;
      const r = (i % 2 === 0) ? s * 0.5 : s * (0.5 - tube);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if(i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, s * 0.15, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.25, bevelEnabled: false });
  },

  _geo_wheel(s, spoke){
    const g1 = new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 0.2, 24);
    if(!spoke) return g1;
    const g2 = new THREE.BoxGeometry(s * 0.8, s * 0.05, s * 0.05);
    const g3 = new THREE.BoxGeometry(s * 0.05, s * 0.8, s * 0.05);
    return this._mergeGeos([g1, g2, g3], [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: s * 0.1 },
      { x: 0, y: 0, z: s * 0.1 }
    ]);
  },

  _geo_bar(s){ return new THREE.BoxGeometry(s, s * 0.2, s * 0.2); },

  _geo_bar_curved(s){
    const pts = [];
    for(let i = 0; i <= 12; i++){
      const t = i / 12;
      pts.push(new THREE.Vector3(t * s - s * 0.5, Math.sin(t * Math.PI) * s * 0.25, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 16, s * 0.1, 8, false);
  },

  _geo_beam(s){ return new THREE.BoxGeometry(s, s * 0.25, s * 0.25); },

  _geo_beam_curved(s){
    const pts = [];
    for(let i = 0; i <= 12; i++){
      const t = i / 12;
      pts.push(new THREE.Vector3(t * s - s * 0.5, Math.sin(t * Math.PI) * s * 0.3, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 16, s * 0.15, 8, false);
  },

  _geo_panel(s){ return new THREE.BoxGeometry(s * 0.6, s, s * 0.1); },

  _geo_panel_curved(s){
    const shape = new THREE.Shape();
    shape.moveTo(-s * 0.3, -s * 0.5);
    shape.quadraticCurveTo(0, s * 0.5, s * 0.3, -s * 0.5);
    shape.lineTo(s * 0.3, -s * 0.5);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: s * 0.1, bevelEnabled: false });
  },

  _geo_bracket(s, type){
    if(type === 0){
      const g1 = new THREE.BoxGeometry(s * 0.3, s * 0.3, s * 0.3);
      const g2 = new THREE.BoxGeometry(s * 0.7, s * 0.2, s * 0.2);
      return this._mergeGeos([g1, g2], [
        { x: 0, y: s * 0.2, z: 0 },
        { x: 0, y: -s * 0.15, z: 0 }
      ]);
    }
    if(type === 1){
      const g1 = new THREE.BoxGeometry(s * 0.3, s * 0.8, s * 0.3);
      const g2 = new THREE.BoxGeometry(s * 0.7, s * 0.3, s * 0.3);
      return this._mergeGeos([g1, g2], [
        { x: -s * 0.2, y: 0, z: 0 },
        { x: s * 0.2, y: -s * 0.25, z: 0 }
      ]);
    }
    const g1 = new THREE.BoxGeometry(s, s * 0.3, s * 0.3);
    const g2 = new THREE.BoxGeometry(s * 0.3, s * 0.7, s * 0.3);
    return this._mergeGeos([g1, g2], [
      { x: 0, y: s * 0.35, z: 0 },
      { x: 0, y: -s * 0.15, z: 0 }
    ]);
  },

  _mergeGeos(geos, offsets){
    const positions = [];
    const normals = [];
    for(let i = 0; i < geos.length; i++){
      const g = geos[i];
      const pos = g.attributes.position;
      const nor = g.attributes.normal;
      const ox = offsets[i] ? offsets[i].x : 0;
      const oy = offsets[i] ? offsets[i].y : 0;
      const oz = offsets[i] ? offsets[i].z : 0;
      if(g.index){
        const idx = g.index.array;
        for(let k = 0; k < idx.length; k++){
          const j = idx[k];
          positions.push(pos.getX(j) + ox, pos.getY(j) + oy, pos.getZ(j) + oz);
          if(nor) normals.push(nor.getX(j), nor.getY(j), nor.getZ(j));
        }
      } else {
        for(let j = 0; j < pos.count; j++){
          positions.push(pos.getX(j) + ox, pos.getY(j) + oy, pos.getZ(j) + oz);
          if(nor) normals.push(nor.getX(j), nor.getY(j), nor.getZ(j));
        }
      }
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if(normals.length === positions.length) merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    else merged.computeVertexNormals();
    return merged;
  },

  /* ============================================================
   * 生成 / 删除
   * ============================================================ */
  spawnProp(id, options){
    if(!this.scene) return null;
    options = options || {};

    const shapeId = options.shapeId || 'cube';
    const sizeScale = options.sizeScale || 1.0;
    const colorHex = options.colorHex || '#cccccc';

    const geo = this._geoDispatch(shapeId, sizeScale);
    const mat = this._getPropMat(colorHex);
    const mesh = new THREE.Mesh(geo, mat);

    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    mesh.castShadow = shadowOn;
    mesh.receiveShadow = shadowOn;

    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    let px = 0, pz = -3;
    if(TBOX.Player){
      const yaw = this.camState.yaw;
      const pitch = this.camState.pitch;
      const dirX = -Math.sin(yaw) * Math.cos(pitch);
      const dirY = Math.sin(pitch);
      const dirZ = -Math.cos(yaw) * Math.cos(pitch);
      const originX = TBOX.Player.x;
      const originY = TBOX.Player.y + TBOX.DATA.EYE_H;
      const originZ = TBOX.Player.z;
      let t = 0;
      if(dirY < -0.01){
        t = (0 - originY) / dirY;
        if(t < 0.5 || t > 20) t = 4;
      } else {
        t = 4;
      }
      px = originX + dirX * t;
      pz = originZ + dirZ * t;
    }

    const py = size.y / 2;

    mesh.position.set(px, py, pz);
    mesh.rotation.y = this.camState.yaw;

    this.scene.add(mesh);

    const box = {
      x: px, y: py, z: pz,
      hw: Math.max(0.05, size.x / 2),
      hh: Math.max(0.05, size.y / 2),
      hd: Math.max(0.05, size.z / 2),
      topY: py + size.y / 2,
      bottomY: py - size.y / 2,
      tag: 'prop'
    };
    this.addAABB(box);

    const obj = {
      id: id || ('prop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      mesh: mesh,
      box: box,
      shapeId: shapeId,
      sizeScale: sizeScale,
      colorHex: colorHex,
      label: options.label || '',
      size: size.clone(),
      /* ★ 物理状态 */
      phy: {
        vx: 0, vy: 0, vz: 0,
        onGround: false,
        sleeping: false,
        sleepTimer: 0
      }
    };
    this.props.push(obj);
    return obj;
  },

  deleteProp(obj){
    if(!obj) return false;
    const idx = this.props.indexOf(obj);
    if(idx >= 0) this.props.splice(idx, 1);
    if(this.grabbedProp === obj) this.grabbedProp = null;
    if(obj.mesh){
      this.scene.remove(obj.mesh);
      if(obj.mesh.geometry) obj.mesh.geometry.dispose();
    }
    if(obj.box){
      const bi = this.aabbStatic.indexOf(obj.box);
      if(bi >= 0) this.aabbStatic.splice(bi, 1);
    }
    return true;
  },

  clearProps(){
    for(let i = this.props.length - 1; i >= 0; i--){
      this.deleteProp(this.props[i]);
    }
    this.props.length = 0;
    this.grabbedProp = null;
  }
};