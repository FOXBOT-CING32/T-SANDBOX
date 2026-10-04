/* ============================================================
 * engine.js · 游戏引擎系统
 * V1.1.0 · 后处理修复（renderToScreen）+ 低端降级 + 准星扩散
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

  /* 后处理 */
  composer: null,
  bloomPass: null,
  fxaaPass: null,
  renderPass: null,
  motionBlurPass: null,
  filmGrainPass: null,
  colorGradePass: null,
  postProcessingEnabled: false,
  postProcessingAllowed: true,

  /* CSM */
  csm: null,
  csmEnabled: false,

  /* 准星动态扩散 */
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

  _tmpHeadWorld: null,
  _tmpHeadQuat: null,
  _tmpEuler: null,
  _tmpLookAt: null,
  _tmpShadowQuat: null,
  _lastFilter: '',

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

    /* ★ 低端设备禁用后处理 */
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
    this._applySunAngle();
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

  /* ============================================================
   * ★★★ 后处理初始化（修复 renderToScreen） ★★★
   * ============================================================ */
  _initPostProcessing(){
    if(!this.postProcessingAllowed) return;
    if(typeof THREE.EffectComposer === 'undefined') return;
    try {
      const w = innerWidth, h = innerHeight;
      this.composer = new THREE.EffectComposer(this.renderer);
      this.renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.renderPass.renderToScreen = false;
      this.composer.addPass(this.renderPass);

      /* 1. 泛光 */
      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(w, h),
        TBOX.Save.getNum('tbox_bloomStrength', 50) / 100,
        0.4, 0.85
      );
      this.bloomPass.enabled = TBOX.Save.get('tbox_bloom', '0') === '1';
      this.bloomPass.renderToScreen = false;
      this.composer.addPass(this.bloomPass);

      /* 2. 运动模糊 */
      try {
        const MotionBlurShader = {
          uniforms: {
            tDiffuse: { value: null },
            intensity: { value: 0.5 },
            time: { value: 0 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main(){
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float intensity;
            uniform float time;
            varying vec2 vUv;
            void main(){
              vec4 sum = vec4(0.0);
              float count = 0.0;
              for(float i = 0.0; i < 8.0; i++){
                float t = i / 8.0;
                vec2 offset = vec2(0.0, t * intensity * 0.01);
                sum += texture2D(tDiffuse, vUv + offset);
                count += 1.0;
              }
              vec4 base = texture2D(tDiffuse, vUv);
              gl_FragColor = mix(base, sum / count, 0.5);
            }
          `
        };
        const mbPass = new THREE.ShaderPass(MotionBlurShader);
        mbPass.enabled = TBOX.Save.get('tbox_motionBlur', '0') === '1';
        mbPass.renderToScreen = false;
        this.motionBlurPass = mbPass;
        this.composer.addPass(mbPass);
      } catch(e){ console.warn('[Engine] 运动模糊初始化失败', e); }

      /* 3. 胶片颗粒 */
      try {
        const FilmGrainShader = {
          uniforms: {
            tDiffuse: { value: null },
            time: { value: 0 },
            intensity: { value: 0.15 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main(){
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform float intensity;
            varying vec2 vUv;
            float rand(vec2 co){
              return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }
            void main(){
              vec4 color = texture2D(tDiffuse, vUv);
              float grain = rand(vUv + time) - 0.5;
              color.rgb += grain * intensity;
              gl_FragColor = color;
            }
          `
        };
        const fgPass = new THREE.ShaderPass(FilmGrainShader);
        fgPass.enabled = TBOX.Save.get('tbox_filmGrain', '0') === '1';
        fgPass.renderToScreen = false;
        this.filmGrainPass = fgPass;
        this.composer.addPass(fgPass);
      } catch(e){ console.warn('[Engine] 胶片颗粒初始化失败', e); }

      /* 4. 色彩校正 */
      try {
        const ColorGradeShader = {
          uniforms: {
            tDiffuse: { value: null },
            saturation: { value: 1.0 },
            contrast: { value: 1.0 },
            brightness: { value: 1.0 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main(){
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float saturation;
            uniform float contrast;
            uniform float brightness;
            varying vec2 vUv;
            void main(){
              vec4 color = texture2D(tDiffuse, vUv);
              float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
              color.rgb = mix(vec3(gray), color.rgb, saturation);
              color.rgb = (color.rgb - 0.5) * contrast + 0.5;
              color.rgb *= brightness;
              gl_FragColor = color;
            }
          `
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

      /* 5. FXAA */
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

      /* ★★★ 关键修复：最后一个启用的 pass 必须 renderToScreen = true ★★★ */
      this._updateRenderToScreen();

      this.postProcessingEnabled = true;
    } catch(e){
      console.warn('[Engine] 后处理初始化失败', e);
      this.postProcessingEnabled = false;
    }
  },

  /* 更新哪个 pass 是最后渲染到屏幕的 */
  _updateRenderToScreen(){
    if(!this.composer) return;
    var passes = this.composer.passes;
    for(var i = 0; i < passes.length; i++) passes[i].renderToScreen = false;
    /* 从后往前找第一个 enabled 的 */
    for(var j = passes.length - 1; j >= 0; j--){
      if(passes[j].enabled){
        passes[j].renderToScreen = true;
        break;
      }
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
    /* ★ 每次更新后重新计算 renderToScreen */
    this._updateRenderToScreen();
  },

  /* ============================================================
   * CSM 级联阴影
   * ============================================================ */
  _initCSM(){
    if(typeof THREE.CSM === 'undefined'){ console.warn('[Engine] CSM 未加载'); return; }
    if(this.csm) return;
    try {
      const csm = new THREE.CSM({
        maxFar: 200,
        cascades: 3,
        mode: 'practical',
        parent: this.scene,
        shadowMapSize: 2048,
        lightDirection: new THREE.Vector3(0.5, 1, 0.3).normalize(),
        camera: this.camera,
        lightIntensity: 2.0,
        lightNear: 1,
        lightFar: 200,
        lightMargin: 100
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
    this._applySunAngle();
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
    const sun = TBOX.Save.getNum('tbox_sunIntensity', 100) / 100;
    const lightingOn = TBOX.Save.get('tbox_lighting', '0') === '1';
    if(this.hemiLight) this.hemiLight.intensity = (lightingOn ? 0.85 : 0.2) * amb;
    if(this.sunLight) this.sunLight.intensity = (lightingOn ? 2.0 : 0.3) * sun;
    if(this.csm && this.csm.lightIntensity !== undefined){
      this.csm.lightIntensity = (lightingOn ? 2.0 : 0.3) * sun;
    }
  },

  _applySunAngle(){
    const angleDeg = TBOX.Save.getNum('tbox_sunAngle', 180);
    const angleRad = angleDeg * Math.PI / 180;
    const dist = 50;
    const x = Math.sin(angleRad) * dist;
    const z = Math.cos(angleRad) * dist;
    const y = Math.max(10, Math.sin(angleRad) * 40 + 30);
    if(this.sunLight) this.sunLight.position.set(x, y, z);
    if(this.csm) this.csm.lightDirection.set(x, y, z).normalize();
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

  _applyLighting(on){
    this._applyLightIntensities();
  },

  _buildStairs(){
    const S = TBOX.DATA.STAIRS;
    const mat = new THREE.MeshStandardMaterial({ color: TBOX.DATA.COLOR.stair, roughness: .85, metalness: .05 });
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
      case 'tbox_sunIntensity':
      case 'tbox_lighting':
        this._applyLightIntensities();
        break;
      case 'tbox_sunAngle':
        this._applySunAngle();
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
        'tbox_ambientIntensity', 'tbox_sunIntensity', 'tbox_sunAngle',
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
    if(this.dummy && this.dummy.alive && this.dummy.group){
      const dx = p.x - this.dummy.group.position.x;
      const dz = p.z - this.dummy.group.position.z;
      const dist = Math.hypot(dx, dz);
      const PUSH = TBOX.DATA.PLAYER_RADIUS + this.dummy.radius;
      if(dist < PUSH && dist > 0.0001){
        p.x += (dx / dist) * (PUSH - dist);
        p.z += (dz / dist) * (PUSH - dist);
      }
    }
    if(TBOX.Corpse && TBOX.Corpse.list){
      for(const c of TBOX.Corpse.list){
        const dx = p.x - c.x, dz = p.z - c.z;
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
        const dx = p.x - s.x, dz = p.z - s.z;
        const halfW = s.halfW + TBOX.DATA.PLAYER_RADIUS;
        const halfD = s.halfD + TBOX.DATA.PLAYER_RADIUS;
        if(p.y >= s.topY - 0.15) continue;
        if(Math.abs(dx) < halfW && Math.abs(dz) < halfD){
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          if(overlapX < overlapZ) p.x += (dx > 0 ? overlapX : -overlapX);
          else p.z += (dz > 0 ? overlapZ : -overlapZ);
        }
      }
    }
  },

  resolvePlayerGround(p){
    let groundY = 0;
    let onStair = false;
    for(const s of this.stairs){
      const dx = p.x - s.x, dz = p.z - s.z;
      if(Math.abs(dx) < s.halfW && Math.abs(dz) < s.halfD){
        if(s.topY <= p.y + 0.45 && s.topY > groundY){
          groundY = s.topY;
          onStair = true;
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
    if(p.speedFactor > 0.1){
      target += Math.min(0.5, p.speedFactor * 0.5);
    }
    if(p.attackTimer > 0){
      target += 0.7;
    }
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
    if(!isFinite(rawDt) || rawDt <= 0){
      this._render();
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
      this._render();
      return;
    }
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
    if(this.onUpdateFragments) this.onUpdateFragments(rawDt);
    this.updateCrosshairSpread(dt);
    TBOX.UI.updateCompass(this.camState.yaw);
    TBOX.UI.updateHurtVignette(this.player);
    TBOX.UI.updateHpHud(this.player);
    if(this.csm && this.csmEnabled){
      this.csm.update();
    }
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
  }
};