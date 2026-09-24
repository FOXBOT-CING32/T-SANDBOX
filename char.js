/* ============================================================
 * char.js · 角色编辑器逻辑（★ 完全重写）
 * V1.0.0
 * - 实时保存（每次修改立即存）
 * - 打开时恢复上次配置
 * - 名字同步 tbox_charName
 * - 重建节流 80ms
 * - 彻底 dispose 旧模型
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Char = {
  scene: null,
  camera: null,
  renderer: null,
  characterGroup: null,
  character: null,

  camYaw: 0.4,
  camPitch: 0.15,
  camDist: 4.5,
  camTargetY: 1.2,
  dragging: false,
  lastX: 0,
  lastY: 0,

  clock: 0,
  _pendingTextures: {},
  _rebuildTimer: null,
  _lastRebuildTime: 0,
  _saveTimer: null,

  /* ============================================================
   * 初始化
   * ============================================================ */
  init(){
    const canvas = document.getElementById('preview');
    if(!canvas) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3a3a3a);

    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.updateCameraPos();

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    /* 灯光 */
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));

    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(3, 6, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 20;
    dir.shadow.camera.left = -4;
    dir.shadow.camera.right = 4;
    dir.shadow.camera.top = 4;
    dir.shadow.camera.bottom = -4;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0xa0b8d0, 0.4);
    fill.position.set(-3, 4, -2);
    this.scene.add(fill);

    this.buildRoom();

    this.characterGroup = new THREE.Group();
    this.scene.add(this.characterGroup);

    /* ============================================================
     * 加载配置（优先 IndexedDB，回退 localStorage）
     * ============================================================ */
    const self = this;
    const loadCfg = (TBOX.Save && TBOX.Save.getCharAsync)
      ? TBOX.Save.getCharAsync()
      : Promise.resolve(TBOX.Save.getChar());

    loadCfg.then(function(cfg){
      self.applyConfigToUI(cfg);
      self.buildCharacter(cfg);
    }).catch(function(err){
      console.warn('[Char] 加载配置失败，使用默认:', err);
      const cfg = TBOX.Save.getChar();
      self.applyConfigToUI(cfg);
      self.buildCharacter(cfg);
    });

    this.bindEvents();
    this.bindTabs();
    this.bindPartUploads();
    this.bindSizeSliders();
    this.bindAccessorySegs();

    this.clock = performance.now();
    this.loop();
  },

  /* ============================================================
   * 房间
   * ============================================================ */
  buildRoom(){
    const SIZE = 10;
    const H = 5;

    const floorGeo = new THREE.PlaneGeometry(SIZE, SIZE);
    const floor = new THREE.Mesh(floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceil = new THREE.Mesh(floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.scene.add(ceil);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1, side: THREE.DoubleSide });
    const wallGeo = new THREE.PlaneGeometry(SIZE, H);
    const positions = [
      [0, H/2, -SIZE/2, 0],
      [0, H/2, SIZE/2, Math.PI],
      [-SIZE/2, H/2, 0, Math.PI/2],
      [SIZE/2, H/2, 0, -Math.PI/2]
    ];
    for(let i = 0; i < positions.length; i++){
      const p = positions[i];
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(p[0], p[1], p[2]);
      w.rotation.y = p[3];
      this.scene.add(w);
    }

    const grid = new THREE.GridHelper(SIZE, 20, 0x555555, 0x4a4a4a);
    grid.position.y = 0.01;
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    this.scene.add(grid);
  },

  /* ============================================================
   * 构建角色
   * ============================================================ */
  buildCharacter(cfg){
    /* 彻底清理旧模型 */
    if(this.character && this.character.root){
      this.character.root.traverse(function(o){
        if(o.isMesh){
          if(o.geometry) o.geometry.dispose();
          if(o.material){
            if(Array.isArray(o.material)){
              o.material.forEach(function(m){
                if(m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if(o.material.map) o.material.map.dispose();
              o.material.dispose();
            }
          }
        }
      });
      this.characterGroup.remove(this.character.root);
    }

    cfg = cfg || TBOX.Save.getChar();
    const ch = TBOX.CharBuilder.build(cfg);
    this.characterGroup.add(ch.root);
    this.character = ch;

    /* 应用尺寸 */
    if(TBOX.Utils && TBOX.Utils.applyBodyScale){
      TBOX.Utils.applyBodyScale(ch, cfg);
    }
  },

  /* ============================================================
   * 重建节流（80ms）
   * ============================================================ */
  rebuildThrottled(){
    const self = this;
    const now = performance.now();
    const elapsed = now - this._lastRebuildTime;

    if(elapsed > 80){
      this._lastRebuildTime = now;
      this.rebuildNow();
    } else {
      clearTimeout(this._rebuildTimer);
      this._rebuildTimer = setTimeout(function(){
        self._lastRebuildTime = performance.now();
        self.rebuildNow();
      }, 80 - elapsed);
    }
  },

  rebuildNow(){
    const cfg = this.collectConfig();
    this.buildCharacter(cfg);
    this.autoSave(cfg);
  },

  /* ============================================================
   * 自动保存（防抖 500ms）
   * ============================================================ */
  autoSave(cfg){
    const self = this;
    cfg = cfg || this.collectConfig();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(function(){
      if(TBOX.Save && TBOX.Save.setChar){
        TBOX.Save.setChar(cfg).then(function(){
          /* 名字同步 */
          try { localStorage.setItem('tbox_charName', cfg.name || 'Player'); } catch(e){}
        }).catch(function(){});
      }
    }, 500);
  },

  /* ============================================================
   * 收集配置
   * ============================================================ */
  collectConfig(){
    const $ = function(id){ return document.getElementById(id); };
    const val = function(id, def){
      const el = $(id);
      if(!el) return def;
      return el.value;
    };
    const seg = function(id, def){
      const el = $(id);
      if(!el) return def || 'none';
      const on = el.querySelector('.on');
      return on ? on.dataset.v : (def || 'none');
    };

    const cfg = (TBOX.Save && TBOX.Save.getChar) ? TBOX.Save.getChar() : {};

    /* 基本 */
    cfg.name = val('inName', 'Player') || 'Player';

    /* 14 部位贴图 + 颜色 + 模式 */
    const partFields = [
      { field: 'face',          url: 'inFaceUrl',        color: 'inFaceColor',        mode: 'segFaceMode' },
      { field: 'texTorso',      url: 'inTorsoUrl',       color: 'inTorsoColor',       mode: 'segTorsoMode' },
      { field: 'texArmL_upper', url: 'inArmLUpperUrl',   color: 'inArmLUpperColor',   mode: null },
      { field: 'texArmL_lower', url: 'inArmLLowerUrl',   color: 'inArmLLowerColor',   mode: null },
      { field: 'texArmR_upper', url: 'inArmRUpperUrl',   color: 'inArmRUpperColor',   mode: null },
      { field: 'texArmR_lower', url: 'inArmRLowerUrl',   color: 'inArmRLowerColor',   mode: null },
      { field: 'texHandL',      url: 'inHandLUrl',       color: 'inHandLColor',       mode: null },
      { field: 'texHandR',      url: 'inHandRUrl',       color: 'inHandRColor',       mode: null },
      { field: 'texLegL_upper', url: 'inLegLUpperUrl',   color: 'inLegLUpperColor',   mode: null },
      { field: 'texLegL_lower', url: 'inLegLLowerUrl',   color: 'inLegLLowerColor',   mode: null },
      { field: 'texLegR_upper', url: 'inLegRUpperUrl',   color: 'inLegRUpperColor',   mode: null },
      { field: 'texLegR_lower', url: 'inLegRLowerUrl',   color: 'inLegRLowerColor',   mode: null },
      { field: 'texFootL',      url: 'inFootLUrl',       color: 'inFootLColor',       mode: null },
      { field: 'texFootR',      url: 'inFootRUrl',       color: 'inFootRColor',       mode: null }
    ];

    /* 字段名 → 颜色配置键名 */
    const colorKeyMap = {
      face: 'colorFace',
      texTorso: 'colorTorso',
      texArmL_upper: 'colorArmLUpper',
      texArmL_lower: 'colorArmLLower',
      texArmR_upper: 'colorArmRUpper',
      texArmR_lower: 'colorArmRLower',
      texHandL: 'colorHandL',
      texHandR: 'colorHandR',
      texLegL_upper: 'colorLegLUpper',
      texLegL_lower: 'colorLegLLower',
      texLegR_upper: 'colorLegRUpper',
      texLegR_lower: 'colorLegRLower',
      texFootL: 'colorFootL',
      texFootR: 'colorFootR'
    };
    const modeKeyMap = {
      face: 'faceMode',
      texTorso: 'modeTorso'
    };

    partFields.forEach(function(p){
      /* 贴图：优先用 pending（本次上传），其次 URL 输入框，最后保留原值 */
      const pending = TBOX.Char._pendingTextures[p.field];
      if(pending !== undefined){
        cfg[p.field] = pending;
      } else {
        const url = val(p.url, '');
        if(url) cfg[p.field] = url;
      }

      /* 颜色 */
      const ck = colorKeyMap[p.field];
      if(ck){
        const c = val(p.color, '');
        if(c) cfg[ck] = c;
      }

      /* 模式 */
      if(p.mode){
        const mk = modeKeyMap[p.field];
        if(mk) cfg[mk] = seg(p.mode, 'overlay');
      }
    });

    /* 尺寸 */
    const sizeFields = [
      'sizeHeight','sizeHeadRatio','sizeShoulder','sizeArmLength',
      'sizeHandSize','sizeLegLength','sizeFootSize','sizeBodyThick'
    ];
    sizeFields.forEach(function(k){
      const v = Number(val('inSize' + k.charAt(4).toUpperCase() + k.slice(5), null));
      if(!isNaN(v) && v > 0) cfg[k] = v / 100;
    });

    /* 挂件类型 */
    cfg.hat = seg('segHat');
    cfg.glasses = seg('segGlasses');
    cfg.mask = seg('segMask');
    cfg.headphones = seg('segHeadphones');
    cfg.earring = seg('segEarring');
    cfg.necklace = seg('segNecklace');
    cfg.backpack = seg('segBackpack');
    cfg.cape = seg('segCape');
    cfg.waistbag = seg('segWaistbag');
    cfg.watch = seg('segWatch');
    cfg.armband = seg('segArmband');
    cfg.ring = seg('segRing');
    cfg.kneePad = seg('segKneePad');

    /* 挂件颜色 */
    const accColorFields = [
      ['colorHat', 'inColorHat'],
      ['colorHatGem', 'inColorHatGem'],
      ['colorGlassesFrame', 'inColorGlassesFrame'],
      ['colorGlassesLens', 'inColorGlassesLens'],
      ['colorMask', 'inColorMask'],
      ['colorMaskEar', 'inColorMaskEar'],
      ['colorHeadphones', 'inColorHeadphones'],
      ['colorHeadphonesLight', 'inColorHeadphonesLight'],
      ['colorEarring', 'inColorEarring'],
      ['colorNecklace', 'inColorNecklace'],
      ['colorNecklaceGem', 'inColorNecklaceGem'],
      ['colorChoker', 'inColorChoker'],
      ['colorWatchStrap', 'inColorWatchStrap'],
      ['colorWatchCase', 'inColorWatchCase'],
      ['colorArmband', 'inColorArmband'],
      ['colorArmbandBadge', 'inColorArmbandBadge'],
      ['colorRing', 'inColorRing'],
      ['colorRingGem', 'inColorRingGem'],
      ['colorBackpack', 'inColorBackpack'],
      ['colorBackpackStrap', 'inColorBackpackStrap'],
      ['colorBackpackZip', 'inColorBackpackZip'],
      ['colorCape', 'inColorCape'],
      ['colorCapeCollar', 'inColorCapeCollar'],
      ['colorWaistbag', 'inColorWaistbag'],
      ['colorWaistbagZip', 'inColorWaistbagZip'],
      ['colorKneePad', 'inColorKneePad']
    ];
    accColorFields.forEach(function(pair){
      const c = val(pair[1], '');
      if(c) cfg[pair[0]] = c;
    });

    return cfg;
  },

  /* ============================================================
   * 填充 UI
   * ============================================================ */
  applyConfigToUI(cfg){
    cfg = cfg || TBOX.Save.getChar();
    const $ = function(id){ return document.getElementById(id); };

    const setVal = function(id, v){
      const el = $(id);
      if(el && v !== undefined && v !== null) el.value = v;
    };
    const setSeg = function(id, v){
      const el = $(id);
      if(!el) return;
      el.querySelectorAll('div').forEach(function(d){
        d.classList.toggle('on', d.dataset.v === (v || 'none'));
      });
    };

    /* 基本 */
    setVal('inName', cfg.name || 'Player');

    /* 14 部位 URL 输入框（只填 http/data 开头的） */
    const urlMap = [
      ['inFaceUrl', 'face'],
      ['inTorsoUrl', 'texTorso'],
      ['inArmLUpperUrl', 'texArmL_upper'],
      ['inArmLLowerUrl', 'texArmL_lower'],
      ['inArmRUpperUrl', 'texArmR_upper'],
      ['inArmRLowerUrl', 'texArmR_lower'],
      ['inHandLUrl', 'texHandL'],
      ['inHandRUrl', 'texHandR'],
      ['inLegLUpperUrl', 'texLegL_upper'],
      ['inLegLLowerUrl', 'texLegL_lower'],
      ['inLegRUpperUrl', 'texLegR_upper'],
      ['inLegRLowerUrl', 'texLegR_lower'],
      ['inFootLUrl', 'texFootL'],
      ['inFootRUrl', 'texFootR']
    ];
    urlMap.forEach(function(p){
      const v = cfg[p[1]];
      if(v && (v.indexOf('http') === 0 || v.indexOf('data:') === 0)){
        setVal(p[0], v);
      }
    });

    /* 部位颜色 */
    const partColors = [
      ['inFaceColor', 'colorFace', '#ffcda0'],
      ['inTorsoColor', 'colorTorso', '#2b3a4a'],
      ['inArmLUpperColor', 'colorArmLUpper', '#2b3a4a'],
      ['inArmLLowerColor', 'colorArmLLower', '#ffcda0'],
      ['inArmRUpperColor', 'colorArmRUpper', '#2b3a4a'],
      ['inArmRLowerColor', 'colorArmRLower', '#ffcda0'],
      ['inHandLColor', 'colorHandL', '#ffcda0'],
      ['inHandRColor', 'colorHandR', '#ffcda0'],
      ['inLegLUpperColor', 'colorLegLUpper', '#1a1a1a'],
      ['inLegLLowerColor', 'colorLegLLower', '#1a1a1a'],
      ['inLegRUpperColor', 'colorLegRUpper', '#1a1a1a'],
      ['inLegRLowerColor', 'colorLegRLower', '#1a1a1a'],
      ['inFootLColor', 'colorFootL', '#0a0a0a'],
      ['inFootRColor', 'colorFootR', '#0a0a0a']
    ];
    partColors.forEach(function(p){
      setVal(p[0], cfg[p[1]] || p[2]);
    });

    /* 模式 */
    setSeg('segFaceMode', cfg.faceMode || 'overlay');
    setSeg('segTorsoMode', cfg.modeTorso || 'overlay');

    /* 尺寸 */
    const sizeMap = [
      ['inSizeHeight', 'sizeHeight'],
      ['inSizeHeadRatio', 'sizeHeadRatio'],
      ['inSizeShoulder', 'sizeShoulder'],
      ['inSizeArmLength', 'sizeArmLength'],
      ['inSizeHandSize', 'sizeHandSize'],
      ['inSizeLegLength', 'sizeLegLength'],
      ['inSizeFootSize', 'sizeFootSize'],
      ['inSizeBodyThick', 'sizeBodyThick']
    ];
    sizeMap.forEach(function(p){
      const v = cfg[p[1]];
      setVal(p[0], Math.round((v || 1.0) * 100));
    });
    this.updateSizeLabels();

    /* 挂件类型 */
    setSeg('segHat', cfg.hat);
    setSeg('segGlasses', cfg.glasses);
    setSeg('segMask', cfg.mask);
    setSeg('segHeadphones', cfg.headphones);
    setSeg('segEarring', cfg.earring);
    setSeg('segNecklace', cfg.necklace);
    setSeg('segBackpack', cfg.backpack);
    setSeg('segCape', cfg.cape);
    setSeg('segWaistbag', cfg.waistbag);
    setSeg('segWatch', cfg.watch);
    setSeg('segArmband', cfg.armband);
    setSeg('segRing', cfg.ring);
    setSeg('segKneePad', cfg.kneePad);

    /* 挂件颜色 */
    const accColors = [
      ['inColorHat', 'colorHat', '#1e2430'],
      ['inColorHatGem', 'colorHatGem', '#ff3366'],
      ['inColorGlassesFrame', 'colorGlassesFrame', '#222222'],
      ['inColorGlassesLens', 'colorGlassesLens', '#000000'],
      ['inColorMask', 'colorMask', '#ffffff'],
      ['inColorMaskEar', 'colorMaskEar', '#dddddd'],
      ['inColorHeadphones', 'colorHeadphones', '#1a1a1a'],
      ['inColorHeadphonesLight', 'colorHeadphonesLight', '#4fd1ff'],
      ['inColorEarring', 'colorEarring', '#ffcc33'],
      ['inColorNecklace', 'colorNecklace', '#ffcc33'],
      ['inColorNecklaceGem', 'colorNecklaceGem', '#4fd1ff'],
      ['inColorChoker', 'colorChoker', '#222222'],
      ['inColorWatchStrap', 'colorWatchStrap', '#111111'],
      ['inColorWatchCase', 'colorWatchCase', '#aaaaaa'],
      ['inColorArmband', 'colorArmband', '#aa2222'],
      ['inColorArmbandBadge', 'colorArmbandBadge', '#ffcc33'],
      ['inColorRing', 'colorRing', '#ffcc33'],
      ['inColorRingGem', 'colorRingGem', '#4fd1ff'],
      ['inColorBackpack', 'colorBackpack', '#3a2a1a'],
      ['inColorBackpackStrap', 'colorBackpackStrap', '#111111'],
      ['inColorBackpackZip', 'colorBackpackZip', '#aaaaaa'],
      ['inColorCape', 'colorCape', '#1a1a1a'],
      ['inColorCapeCollar', 'colorCapeCollar', '#000000'],
      ['inColorWaistbag', 'colorWaistbag', '#3a2a1a'],
      ['inColorWaistbagZip', 'colorWaistbagZip', '#aaaaaa'],
      ['inColorKneePad', 'colorKneePad', '#111111']
    ];
    accColors.forEach(function(p){
      setVal(p[0], cfg[p[1]] || p[2]);
    });
  },

  updateSizeLabels(){
    const pairs = [
      ['inSizeHeight', 'valSizeHeight'],
      ['inSizeHeadRatio', 'valSizeHeadRatio'],
      ['inSizeShoulder', 'valSizeShoulder'],
      ['inSizeArmLength', 'valSizeArmLength'],
      ['inSizeHandSize', 'valSizeHandSize'],
      ['inSizeLegLength', 'valSizeLegLength'],
      ['inSizeFootSize', 'valSizeFootSize'],
      ['inSizeBodyThick', 'valSizeBodyThick']
    ];
    pairs.forEach(function(p){
      const el = document.getElementById(p[0]);
      const vEl = document.getElementById(p[1]);
      if(el && vEl) vEl.textContent = (Number(el.value) / 100).toFixed(2);
    });
  },

  /* ============================================================
   * 事件绑定
   * ============================================================ */
  bindEvents(){
    const self = this;
    const $ = function(id){ return document.getElementById(id); };

    /* 3D 拖拽 */
    const canvas = $('preview');
    if(canvas){
      canvas.addEventListener('mousedown', function(e){
        self.dragging = true;
        self.lastX = e.clientX;
        self.lastY = e.clientY;
      });
      window.addEventListener('mousemove', function(e){
        if(!self.dragging) return;
        const dx = e.clientX - self.lastX;
        const dy = e.clientY - self.lastY;
        self.lastX = e.clientX;
        self.lastY = e.clientY;
        self.camYaw -= dx * 0.008;
        self.camPitch = Math.max(-0.8, Math.min(0.8, self.camPitch + dy * 0.006));
        self.updateCameraPos();
      });
      window.addEventListener('mouseup', function(){ self.dragging = false; });

      canvas.addEventListener('wheel', function(e){
        e.preventDefault();
        self.camDist = Math.max(2, Math.min(8, self.camDist + e.deltaY * 0.003));
        self.updateCameraPos();
      }, { passive: false });

      let touchId = null, tlx = 0, tly = 0;
      canvas.addEventListener('touchstart', function(e){
        const t = e.changedTouches[0];
        touchId = t.identifier;
        tlx = t.clientX;
        tly = t.clientY;
      }, { passive: true });
      canvas.addEventListener('touchmove', function(e){
        for(let i = 0; i < e.changedTouches.length; i++){
          const t = e.changedTouches[i];
          if(t.identifier !== touchId) continue;
          const dx = t.clientX - tlx;
          const dy = t.clientY - tly;
          tlx = t.clientX;
          tly = t.clientY;
          self.camYaw -= dx * 0.010;
          self.camPitch = Math.max(-0.8, Math.min(0.8, self.camPitch + dy * 0.008));
          self.updateCameraPos();
        }
      }, { passive: true });
      canvas.addEventListener('touchend', function(e){
        for(let i = 0; i < e.changedTouches.length; i++){
          if(e.changedTouches[i].identifier === touchId) touchId = null;
        }
      }, { passive: true });
    }

    /* 所有 input/color 立即保存 */
    const allInputs = document.querySelectorAll('#editor input, #editor select');
    allInputs.forEach(function(el){
      el.addEventListener('input', function(){ self.rebuildThrottled(); });
      el.addEventListener('change', function(){ self.rebuildThrottled(); });
    });

    /* 保存 / 重置 / 返回 */
    if($('btnSave')) $('btnSave').addEventListener('click', function(){ self.save(true); });
    if($('btnReset')) $('btnReset').addEventListener('click', function(){ self.reset(); });
    if($('btnBack')) $('btnBack').addEventListener('click', function(){
      self.save(false);
      window.location.href = 'index.html';
    });
  },

  bindTabs(){
    document.querySelectorAll('#tabs .tab').forEach(function(t){
      t.addEventListener('click', function(){
        const id = t.dataset.tab;
        document.querySelectorAll('#tabs .tab').forEach(function(x){ x.classList.remove('on'); });
        t.classList.add('on');
        document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('on'); });
        const panel = document.querySelector('.tab-panel[data-panel="' + id + '"]');
        if(panel) panel.classList.add('on');
      });
    });
  },

  /* ============================================================
   * 贴图上传（每个部位一个文件输入 + 清除按钮）
   * ============================================================ */
  bindPartUploads(){
    const self = this;
    const parts = [
      { field: 'face',          fileId: 'inFaceFile',        clearId: 'inFaceClear' },
      { field: 'texTorso',      fileId: 'inTorsoFile',       clearId: 'inTorsoClear' },
      { field: 'texArmL_upper', fileId: 'inArmLUpperFile',   clearId: 'inArmLUpperClear' },
      { field: 'texArmR_upper', fileId: 'inArmRUpperFile',   clearId: 'inArmRUpperClear' },
      { field: 'texArmL_lower', fileId: 'inArmLLowerFile',   clearId: 'inArmLLowerClear' },
      { field: 'texArmR_lower', fileId: 'inArmRLowerFile',   clearId: 'inArmRLowerClear' },
      { field: 'texHandL',      fileId: 'inHandLFile',       clearId: 'inHandLClear' },
      { field: 'texHandR',      fileId: 'inHandRFile',       clearId: 'inHandRClear' },
      { field: 'texLegL_upper', fileId: 'inLegLUpperFile',   clearId: 'inLegLUpperClear' },
      { field: 'texLegR_upper', fileId: 'inLegRUpperFile',   clearId: 'inLegRUpperClear' },
      { field: 'texLegL_lower', fileId: 'inLegLLowerFile',   clearId: 'inLegLLowerClear' },
      { field: 'texLegR_lower', fileId: 'inLegRLowerFile',   clearId: 'inLegRLowerClear' },
      { field: 'texFootL',      fileId: 'inFootLFile',       clearId: 'inFootLClear' },
      { field: 'texFootR',      fileId: 'inFootRFile',       clearId: 'inFootRClear' }
    ];

    parts.forEach(function(p){
      const fileEl = document.getElementById(p.fileId);
      const clearEl = document.getElementById(p.clearId);

      if(fileEl){
        fileEl.addEventListener('change', function(e){
          const file = e.target.files[0];
          if(!file) return;

          /* SVG 特殊处理：先检测 */
          if(file.type === 'image/svg+xml'){
            const reader = new FileReader();
            reader.onload = function(ev){
              const text = ev.target.result;
              /* 检查 SVG 是否有 width/height */
              if(!/width\s*=/.test(text) || !/height\s*=/.test(text)){
                if(!confirm('此 SVG 缺少 width/height 属性，可能无法显示。仍要上传吗？')){
                  return;
                }
              }
              self._pendingTextures[p.field] = ev.target.result;
              self.rebuildThrottled();
            };
            reader.readAsDataURL(file);
            return;
          }

          /* 普通图片：压缩到 512 */
          if(TBOX.Utils && TBOX.Utils.imageToDataURL){
            TBOX.Utils.imageToDataURL(file, 512).then(function(dataURL){
              self._pendingTextures[p.field] = dataURL;
              self.rebuildThrottled();
            }).catch(function(err){
              console.warn('上传失败', err);
              self.toast('上传失败');
            });
          }
        });
      }

      if(clearEl){
        clearEl.addEventListener('click', function(){
          self._pendingTextures[p.field] = '';
          /* 同时清 URL 输入框 */
          const urlInput = document.getElementById(p.fileId.replace('File', 'Url'));
          if(urlInput) urlInput.value = '';
          self.rebuildThrottled();
        });
      }
    });
  },

  bindSizeSliders(){
    const self = this;
    const ids = [
      'inSizeHeight','inSizeHeadRatio','inSizeShoulder','inSizeArmLength',
      'inSizeHandSize','inSizeLegLength','inSizeFootSize','inSizeBodyThick'
    ];
    ids.forEach(function(id){
      const el = document.getElementById(id);
      if(el){
        el.addEventListener('input', function(){
          self.updateSizeLabels();
          self.rebuildThrottled();
        });
      }
    });
  },

  bindAccessorySegs(){
    const self = this;
    const ids = [
      'segHat','segGlasses','segMask','segHeadphones','segEarring',
      'segNecklace','segBackpack','segCape','segWaistbag',
      'segWatch','segArmband','segRing','segKneePad',
      'segFaceMode','segTorsoMode'
    ];
    ids.forEach(function(id){
      const el = document.getElementById(id);
      if(!el) return;
      el.querySelectorAll('div').forEach(function(d){
        d.addEventListener('click', function(){
          el.querySelectorAll('div').forEach(function(x){ x.classList.remove('on'); });
          d.classList.add('on');
          self.rebuildThrottled();
        });
      });
    });
  },

  /* ============================================================
   * 保存 / 重置
   * ============================================================ */
  save(showToast){
    const self = this;
    const cfg = this.collectConfig();
    if(TBOX.Save && TBOX.Save.setChar){
      TBOX.Save.setChar(cfg).then(function(){
        self._pendingTextures = {};
        try { localStorage.setItem('tbox_charName', cfg.name || 'Player'); } catch(e){}
        if(showToast) self.toast('已保存');
      }).catch(function(){
        if(showToast) self.toast('保存失败');
      });
    }
  },

  reset(){
    if(!confirm('确定要重置角色吗？')) return;
    const self = this;
    const doReset = function(){
      self._pendingTextures = {};
      const def = TBOX.Save.getChar();
      self.applyConfigToUI(def);
      self.buildCharacter(def);
      self.autoSave(def);
      self.toast('已重置');
    };
    if(TBOX.Save && TBOX.Save.removeChar){
      TBOX.Save.removeChar().then(doReset).catch(doReset);
    } else {
      doReset();
    }
  },

  /* ============================================================
   * 相机 / 循环
   * ============================================================ */
  updateCameraPos(){
    const cx = Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cy = Math.sin(this.camPitch) * this.camDist + this.camTargetY;
    const cz = Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, this.camTargetY, 0);
  },

  loop(){
    const self = this;
    requestAnimationFrame(function(){ self.loop(); });

    const now = performance.now();
    const dt = (now - this.clock) / 1000;
    this.clock = now;
    const safeDt = (dt > 0.1) ? 0.1 : dt;

    if(this.characterGroup){
      const t = now / 1000;
      this.characterGroup.position.y = Math.sin(t * 1.2) * 0.015;
      this.characterGroup.rotation.z = Math.sin(t * 0.6) * 0.02;
      this.characterGroup.rotation.y = Math.sin(t * 0.4) * 0.05;
      if(this.character && this.character.head){
        this.character.head.rotation.y = Math.sin(t * 0.7) * 0.08;
      }
    }

    if(!this.dragging){
      this.camYaw += safeDt * 0.15;
      this.updateCameraPos();
    }

    this.renderer.render(this.scene, this.camera);
  },

  toast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 1500);
  }
};

window.addEventListener('tbox:char-ready', function(){
  try { TBOX.Char.init(); }
  catch(err){
    console.error('Char init error:', err);
    const t = document.getElementById('toast');
    if(t){ t.textContent = '初始化失败: ' + err.message; t.classList.add('show'); }
  }
});

window.addEventListener('resize', function(){
  if(!TBOX.Char.camera) return;
  const canvas = document.getElementById('preview');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  TBOX.Char.camera.aspect = w / h;
  TBOX.Char.camera.updateProjectionMatrix();
  TBOX.Char.renderer.setSize(w, h, false);
});