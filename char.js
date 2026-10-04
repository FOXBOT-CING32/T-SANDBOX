/* ============================================================
 * char.js · 角色编辑器逻辑
 * V1.0.0 · 修复语言开关
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Char = {
  scene: null,
  camera: null,
  renderer: null,
  characterGroup: null,
  character: null,
  camYaw: 0.4, camPitch: 0.15, camDist: 4.5, camTargetY: 1.2,
  dragging: false, lastX: 0, lastY: 0,
  clock: 0,
  _pendingTextures: {},
  _loadedCfg: null,
  _rebuildTimer: null,
  _lastRebuildTime: 0,
  _saveTimer: null,
  _isEmbed: false,

  init(){
    const canvas = document.getElementById('preview');
    if(!canvas) return;

    this._isEmbed = document.body.classList.contains('embed-mode');

    /* 版本 */
    var label = (window.TBOX && window.TBOX.VERSION && window.TBOX.VERSION.LABEL) || '—';
    var badge = document.getElementById('versionBadge');
    if(badge) badge.textContent = label;

    /* 语言 */
    this._whenDataReady(function(){
      TBOX.Char._applyLang();
    });
    TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, function(data){
      if(data.key === 'tbox_lang') TBOX.Char._applyLang();
    });
    window.addEventListener('message', function(e){
      if(!e.data) return;
      if(e.data.type === 'tbox-lang-changed') TBOX.Char._applyLang();
    });

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

    const self = this;
    const loadCfg = (TBOX.Save && TBOX.Save.getCharAsync)
      ? TBOX.Save.getCharAsync()
      : Promise.resolve(TBOX.Save.getChar());

    loadCfg.then(function(cfg){
      self._loadedCfg = Object.assign({}, cfg || {});
      self.applyConfigToUI(cfg);
      self.buildCharacter(cfg);
    }).catch(function(err){
      console.warn('[Char] 加载配置失败，使用默认:', err);
      const cfg = TBOX.Save.getChar();
      self._loadedCfg = Object.assign({}, cfg || {});
      self.applyConfigToUI(cfg);
      self.buildCharacter(cfg);
    });

    this.bindEvents();
    this.bindTabs();
    this.bindPartUploads();
    this.bindAccessorySegs();

    this.clock = performance.now();
    this.loop();
  },

  _whenDataReady(cb){
    if(window.TBOX && TBOX.DATA && TBOX.DATA.TEXT) cb();
    else {
      window.addEventListener('tbox:data-ready', cb, { once: true });
      var tries = 0;
      var timer = setInterval(function(){
        tries++;
        if(window.TBOX && TBOX.DATA && TBOX.DATA.TEXT){ clearInterval(timer); cb(); }
        else if(tries > 40){ clearInterval(timer); cb(); }
      }, 50);
    }
  },

  _applyLang(){
    var TEXT = (window.TBOX && TBOX.DATA && TBOX.DATA.TEXT);
    if(!TEXT) return;
    var lang = (TBOX.Save && TBOX.Save.get) ? TBOX.Save.get('tbox_lang', 'en') : 'en';
    var t = TEXT[lang] || TEXT.en || TEXT.zh || {};
    var changed = 0, missing = 0;
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.dataset.i18n;
      if(t[key] !== undefined){
        var textNode = null;
        for(var i = 0; i < el.childNodes.length; i++){
          var node = el.childNodes[i];
          if(node.nodeType === 3 && node.nodeValue.trim()){ textNode = node; break; }
        }
        if(textNode) textNode.nodeValue = t[key];
        else el.textContent = t[key];
        changed++;
      } else {
        missing++;
      }
    });
    if(window.parent !== window){
      try { window.parent.postMessage({ type: 'tbox-lang-changed', lang: lang }, '*'); } catch(e){}
    }
    console.log('[Char i18n] lang=' + lang + ', 翻译=' + changed + ', 缺key=' + missing);
  },

  buildRoom(){
    const SIZE = 10, H = 5;
    const floorGeo = new THREE.PlaneGeometry(SIZE, SIZE);
    const floor = new THREE.Mesh(floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceil = new THREE.Mesh(floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
    this.scene.add(ceil);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1, side: THREE.DoubleSide });
    const wallGeo = new THREE.PlaneGeometry(SIZE, H);
    [[0, H/2, -SIZE/2, 0], [0, H/2, SIZE/2, Math.PI],
     [-SIZE/2, H/2, 0, Math.PI/2], [SIZE/2, H/2, 0, -Math.PI/2]].forEach(function(p){
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(p[0], p[1], p[2]); w.rotation.y = p[3];
      this.scene.add(w);
    }, this);

    const grid = new THREE.GridHelper(SIZE, 20, 0x555555, 0x4a4a4a);
    grid.position.y = 0.01; grid.material.opacity = 0.4; grid.material.transparent = true;
    this.scene.add(grid);
  },

  buildCharacter(cfg){
    if(this.character && this.character.root){
      this.character.root.traverse(function(o){
        if(o.isMesh){
          if(o.geometry) o.geometry.dispose();
          if(o.material){
            if(Array.isArray(o.material)){
              o.material.forEach(function(m){ if(m.map) m.map.dispose(); m.dispose(); });
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
  },

  rebuildThrottled(){
    const self = this;
    const now = performance.now();
    const elapsed = now - this._lastRebuildTime;
    if(elapsed > 80){ this._lastRebuildTime = now; this.rebuildNow(); }
    else {
      clearTimeout(this._rebuildTimer);
      this._rebuildTimer = setTimeout(function(){
        self._lastRebuildTime = performance.now(); self.rebuildNow();
      }, 80 - elapsed);
    }
  },

  rebuildNow(){
    const cfg = this.collectConfig();
    this.buildCharacter(cfg);
    this.autoSave(cfg);
  },

  autoSave(cfg){
    const self = this;
    cfg = cfg || this.collectConfig();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(function(){
      if(TBOX.Save && TBOX.Save.setChar){
        TBOX.Save.setChar(cfg).then(function(){
          try { localStorage.setItem('tbox_charName', cfg.name || 'Player'); } catch(e){}
        }).catch(function(){});
      }
    }, 500);
  },

  collectConfig(){
    const $ = function(id){ return document.getElementById(id); };
    const val = function(id, def){ const el = $(id); return el ? el.value : def; };
    const seg = function(id, def){
      const el = $(id);
      if(!el) return def || 'none';
      const on = el.querySelector('.on');
      return on ? on.dataset.v : (def || 'none');
    };

    const cfg = Object.assign({}, this._loadedCfg || (TBOX.Save && TBOX.Save.getChar ? TBOX.Save.getChar() : {}));
    cfg.name = val('inName', 'Player') || 'Player';

    const partFields = [
      { field: 'texTorso',      url: 'inTorsoUrl',       color: 'inTorsoColor',       mode: 'segTorsoMode' },
      { field: 'texArmL_upper', url: 'inArmLUpperUrl',   color: 'inArmLUpperColor' },
      { field: 'texArmL_lower', url: 'inArmLLowerUrl',   color: 'inArmLLowerColor' },
      { field: 'texArmR_upper', url: 'inArmRUpperUrl',   color: 'inArmRUpperColor' },
      { field: 'texArmR_lower', url: 'inArmRLowerUrl',   color: 'inArmRLowerColor' },
      { field: 'texHandL',      url: 'inHandLUrl',       color: 'inHandLColor' },
      { field: 'texHandR',      url: 'inHandRUrl',       color: 'inHandRColor' },
      { field: 'texLegL_upper', url: 'inLegLUpperUrl',   color: 'inLegLUpperColor' },
      { field: 'texLegL_lower', url: 'inLegLLowerUrl',   color: 'inLegLLowerColor' },
      { field: 'texLegR_upper', url: 'inLegRUpperUrl',   color: 'inLegRUpperColor' },
      { field: 'texLegR_lower', url: 'inLegRLowerUrl',   color: 'inLegRLowerColor' },
      { field: 'texFootL',      url: 'inFootLUrl',       color: 'inFootLColor' },
      { field: 'texFootR',      url: 'inFootRUrl',       color: 'inFootRColor' }
    ];
    const colorKeyMap = {
      texTorso: 'colorTorso', texArmL_upper: 'colorArmLUpper', texArmL_lower: 'colorArmLLower',
      texArmR_upper: 'colorArmRUpper', texArmR_lower: 'colorArmRLower',
      texHandL: 'colorHandL', texHandR: 'colorHandR',
      texLegL_upper: 'colorLegLUpper', texLegL_lower: 'colorLegLLower',
      texLegR_upper: 'colorLegRUpper', texLegR_lower: 'colorLegRLower',
      texFootL: 'colorFootL', texFootR: 'colorFootR'
    };
    partFields.forEach(function(p){
      const pending = TBOX.Char._pendingTextures[p.field];
      if(pending !== undefined) cfg[p.field] = pending;
      const ck = colorKeyMap[p.field];
      if(ck && p.color){ const c = val(p.color, ''); if(c) cfg[ck] = c; }
      if(p.mode){
        if(p.field === 'texTorso') cfg.modeTorso = seg('segTorsoMode', 'overlay');
      }
    });

    const hipColor = val('inHipsColor', '');
    if(hipColor) cfg.colorHips = hipColor;

    cfg.headWrap = seg('segHeadWrap', 'front');
    const faceFields = ['face','faceBack','faceLeft','faceRight','faceTop','faceBottom'];
    const faceUrlIds = ['inFaceUrl','inFaceBackUrl','inFaceLeftUrl','inFaceRightUrl','inFaceTopUrl','inFaceBottomUrl'];
    faceFields.forEach(function(f, i){
      const pending = TBOX.Char._pendingTextures[f];
      if(pending !== undefined) cfg[f] = pending;
      else {
        const url = val(faceUrlIds[i], '');
        if(url) cfg[f] = url;
      }
    });
    cfg.colorFace = val('inFaceColor', '') || cfg.colorFace;
    cfg.colorFaceBack = val('inFaceBackColor', '') || cfg.colorFaceBack;
    cfg.colorFaceLeft = val('inFaceLeftColor', '') || cfg.colorFaceLeft;
    cfg.colorFaceRight = val('inFaceRightColor', '') || cfg.colorFaceRight;
    cfg.colorFaceTop = val('inFaceTopColor', '') || cfg.colorFaceTop;
    cfg.colorFaceBottom = val('inFaceBottomColor', '') || cfg.colorFaceBottom;

    cfg.hat = seg('segHat');
    cfg.glasses = seg('segGlasses');
    cfg.back = seg('segBack');
    cfg.kneePad = seg('segKneePad');
    cfg.elbowPadLeft = seg('segElbowPadLeft');
    cfg.elbowPadRight = seg('segElbowPadRight');

    ['colorHat','colorHatGem','colorGlassesFrame','colorGlassesLens',
     'colorBackpack','colorBackpackStrap','colorBackpackZip',
     'colorCape','colorCapeCollar','colorKneePad','colorElbowPad'].forEach(function(k){
      const inputId = 'in' + k.charAt(0).toUpperCase() + k.slice(1);
      const c = val(inputId, '');
      if(c) cfg[k] = c;
    });

    const capeImg = TBOX.Char._pendingTextures['capeImage'];
    if(capeImg !== undefined) cfg.capeImage = capeImg;
    else {
      const url = val('inCapeUrl', '');
      if(url) cfg.capeImage = url;
    }

    return cfg;
  },

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

    setVal('inName', cfg.name || 'Player');
    setVal('inHipsColor', cfg.colorHips || '#1a1a1a');
    setVal('inFaceUrl', cfg.face && cfg.face.indexOf('http') === 0 ? cfg.face : '');
    setVal('inFaceBackUrl', cfg.faceBack && cfg.faceBack.indexOf('http') === 0 ? cfg.faceBack : '');
    setVal('inFaceLeftUrl', cfg.faceLeft && cfg.faceLeft.indexOf('http') === 0 ? cfg.faceLeft : '');
    setVal('inFaceRightUrl', cfg.faceRight && cfg.faceRight.indexOf('http') === 0 ? cfg.faceRight : '');
    setVal('inFaceTopUrl', cfg.faceTop && cfg.faceTop.indexOf('http') === 0 ? cfg.faceTop : '');
    setVal('inFaceBottomUrl', cfg.faceBottom && cfg.faceBottom.indexOf('http') === 0 ? cfg.faceBottom : '');
    setVal('inFaceColor', cfg.colorFace || '#ffcda0');
    setVal('inFaceBackColor', cfg.colorFaceBack || '#ffcda0');
    setVal('inFaceLeftColor', cfg.colorFaceLeft || '#ffcda0');
    setVal('inFaceRightColor', cfg.colorFaceRight || '#ffcda0');
    setVal('inFaceTopColor', cfg.colorFaceTop || '#ffcda0');
    setVal('inFaceBottomColor', cfg.colorFaceBottom || '#ffcda0');

    setSeg('segHeadWrap', cfg.headWrap || 'front');

    const urlMap = [
      ['inTorsoUrl', 'texTorso'], ['inArmLUpperUrl', 'texArmL_upper'], ['inArmLLowerUrl', 'texArmL_lower'],
      ['inArmRUpperUrl', 'texArmR_upper'], ['inArmRLowerUrl', 'texArmR_lower'],
      ['inHandLUrl', 'texHandL'], ['inHandRUrl', 'texHandR'],
      ['inLegLUpperUrl', 'texLegL_upper'], ['inLegLLowerUrl', 'texLegL_lower'],
      ['inLegRUpperUrl', 'texLegR_upper'], ['inLegRLowerUrl', 'texLegR_lower'],
      ['inFootLUrl', 'texFootL'], ['inFootRUrl', 'texFootR']
    ];
    urlMap.forEach(function(p){
      const v = cfg[p[1]];
      if(v && (v.indexOf('http') === 0 || v.indexOf('data:') === 0)) setVal(p[0], v);
    });

    const partColors = [
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
    partColors.forEach(function(p){ setVal(p[0], cfg[p[1]] || p[2]); });

    setSeg('segTorsoMode', cfg.modeTorso || 'overlay');
    setSeg('segHat', cfg.hat);
    setSeg('segGlasses', cfg.glasses);
    setSeg('segBack', cfg.back);
    setSeg('segKneePad', cfg.kneePad);
    setSeg('segElbowPadLeft', cfg.elbowPadLeft || 'none');
    setSeg('segElbowPadRight', cfg.elbowPadRight || 'none');

    const accColors = [
      ['inColorHat', 'colorHat', '#1e2430'],
      ['inColorHatGem', 'colorHatGem', '#ff3366'],
      ['inColorGlassesFrame', 'colorGlassesFrame', '#222222'],
      ['inColorGlassesLens', 'colorGlassesLens', '#000000'],
      ['inColorBackpack', 'colorBackpack', '#3a2a1a'],
      ['inColorBackpackStrap', 'colorBackpackStrap', '#111111'],
      ['inColorBackpackZip', 'colorBackpackZip', '#aaaaaa'],
      ['inColorCape', 'colorCape', '#1a1a1a'],
      ['inColorCapeCollar', 'colorCapeCollar', '#000000'],
      ['inColorKneePad', 'colorKneePad', '#111111'],
      ['inColorElbowPad', 'colorElbowPad', '#111111']
    ];
    accColors.forEach(function(p){ setVal(p[0], cfg[p[1]] || p[2]); });

    if(cfg.capeImage && cfg.capeImage.indexOf('http') === 0) setVal('inCapeUrl', cfg.capeImage);
  },

  bindEvents(){
    const self = this;
    const $ = function(id){ return document.getElementById(id); };
    const canvas = $('preview');
    if(canvas){
      canvas.addEventListener('mousedown', function(e){
        self.dragging = true; self.lastX = e.clientX; self.lastY = e.clientY;
      });
      window.addEventListener('mousemove', function(e){
        if(!self.dragging) return;
        const dx = e.clientX - self.lastX;
        const dy = e.clientY - self.lastY;
        self.lastX = e.clientX; self.lastY = e.clientY;
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
        touchId = t.identifier; tlx = t.clientX; tly = t.clientY;
      }, { passive: true });
      canvas.addEventListener('touchmove', function(e){
        for(let i = 0; i < e.changedTouches.length; i++){
          const t = e.changedTouches[i];
          if(t.identifier !== touchId) continue;
          const dx = t.clientX - tlx;
          const dy = t.clientY - tly;
          tlx = t.clientX; tly = t.clientY;
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

    document.querySelectorAll('#editor input, #editor select').forEach(function(el){
      el.addEventListener('input', function(){ self.rebuildThrottled(); });
      el.addEventListener('change', function(){ self.rebuildThrottled(); });
    });

    if($('btnSave')) $('btnSave').addEventListener('click', function(){ self.save(true); });
    if($('btnReset')) $('btnReset').addEventListener('click', function(){ self.reset(); });
    if($('btnBack')) $('btnBack').addEventListener('click', function(){
      self.save(false);
      if(self._isEmbed){
        try { window.parent.postMessage({ type: 'tbox-char-close' }, '*'); } catch(e){}
      } else {
        window.location.href = 'index.html';
      }
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

  bindPartUploads(){
    const self = this;
    const parts = [
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
      { field: 'texFootR',      fileId: 'inFootRFile',       clearId: 'inFootRClear' },
      { field: 'capeImage',     fileId: 'inCapeFile',        clearId: 'inCapeClear' },
      { field: 'face',          fileId: 'inFaceFile',        clearId: 'inFaceClear' },
      { field: 'faceBack',      fileId: 'inFaceBackFile',    clearId: 'inFaceBackClear' },
      { field: 'faceLeft',      fileId: 'inFaceLeftFile',    clearId: 'inFaceLeftClear' },
      { field: 'faceRight',     fileId: 'inFaceRightFile',   clearId: 'inFaceRightClear' },
      { field: 'faceTop',       fileId: 'inFaceTopFile',     clearId: 'inFaceTopClear' },
      { field: 'faceBottom',    fileId: 'inFaceBottomFile',  clearId: 'inFaceBottomClear' }
    ];

    parts.forEach(function(p){
      const fileEl = document.getElementById(p.fileId);
      const clearEl = document.getElementById(p.clearId);

      if(fileEl){
        fileEl.addEventListener('change', function(e){
          const file = e.target.files[0];
          if(!file) return;
          if(file.type === 'image/svg+xml'){
            const reader = new FileReader();
            reader.onload = function(ev){
              self._pendingTextures[p.field] = ev.target.result;
              self.rebuildThrottled();
            };
            reader.readAsDataURL(file);
            return;
          }
          if(TBOX.Utils && TBOX.Utils.imageToDataURL){
            TBOX.Utils.imageToDataURL(file, 512).then(function(dataURL){
              self._pendingTextures[p.field] = dataURL;
              self.rebuildThrottled();
            }).catch(function(){ self.toast('Upload failed'); });
          }
        });
      }
      if(clearEl){
        clearEl.addEventListener('click', function(){
          self._pendingTextures[p.field] = '';
          const urlInput = document.getElementById(p.fileId.replace('File', 'Url'));
          if(urlInput) urlInput.value = '';
          self.rebuildThrottled();
        });
      }
    });
  },

  bindAccessorySegs(){
    const self = this;
    const ids = ['segHat','segGlasses','segBack','segKneePad',
                 'segElbowPadLeft','segElbowPadRight','segTorsoMode','segHeadWrap'];
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

  save(showToast){
    const self = this;
    const cfg = this.collectConfig();
    if(TBOX.Save && TBOX.Save.setChar){
      TBOX.Save.setChar(cfg).then(function(){
        self._loadedCfg = Object.assign({}, self._loadedCfg || {}, cfg);
        self._pendingTextures = {};
        try { localStorage.setItem('tbox_charName', cfg.name || 'Player'); } catch(e){}
        if(showToast){
          var TEXT = window.TBOX && TBOX.DATA && TBOX.DATA.TEXT;
          var lang = TBOX.Save.get('tbox_lang', 'en');
          var T = (TEXT && TEXT[lang]) ? TEXT[lang] : {};
          self.toast(T.charSaved || 'Saved');
        }
        if(self._isEmbed){
          try { window.parent.postMessage({ type: 'tbox-char-saved', name: cfg.name }, '*'); } catch(e){}
        }
      }).catch(function(){
        if(showToast) self.toast('Save failed');
      });
    }
  },

  reset(){
    const lang = TBOX.Save.get('tbox_lang', 'en');
    const TEXT = window.TBOX && TBOX.DATA && TBOX.DATA.TEXT;
    const T = (TEXT && TEXT[lang]) ? TEXT[lang] : {};
    if(!confirm(T.confirmReset || 'Reset character?')) return;
    const self = this;
    const doReset = function(){
      self._pendingTextures = {};
      self._loadedCfg = null;
      const def = TBOX.Save.getChar();
      self._loadedCfg = Object.assign({}, def || {});
      self.applyConfigToUI(def);
      self.buildCharacter(def);
      self.autoSave(def);
      self.toast(T.charResetDone || 'Reset');
    };
    if(TBOX.Save && TBOX.Save.removeChar){
      TBOX.Save.removeChar().then(doReset).catch(doReset);
    } else doReset();
  },

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
      if(this.character){
        TBOX.CharBuilder.updateCape(this.character, t, 0, 'idle');
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
    if(t){ t.textContent = 'Init failed: ' + err.message; t.classList.add('show'); }
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