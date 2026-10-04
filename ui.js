/* ============================================================
 * ui.js · UI 系统
 * V1.1.0 · 12 种准星 + 8 种击中图标 + 7 种帧率位置 + 后处理
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.UI = {
  els: {},
  crosshairToken: 0,
  hitFlashToken: 0,
  toastTimer: null,

  heartWaveBuf: [],
  lungWaveBuf: [],
  heartWaveMax: 120,
  lungWaveMax: 120,

  killFeed: [],
  killFeedMax: 5,

  _chSpread: 0,

  _compass: {
    visibleDeg: 120,
    pxPerDeg: 6,
    dirs: [
      { deg: 0,   label: 'N',  num: '000' },
      { deg: 45,  label: 'NE', num: '045' },
      { deg: 90,  label: 'E',  num: '090' },
      { deg: 135, label: 'SE', num: '135' },
      { deg: 180, label: 'S',  num: '180' },
      { deg: 225, label: 'SW', num: '225' },
      { deg: 270, label: 'W',  num: '270' },
      { deg: 315, label: 'NW', num: '315' }
    ],
    nodePool: [],
    lastRenderYaw: null,
    collectPool: [],
    collectCount: 0
  },

  init(){
    this.els = {
      crosshair: document.getElementById('crosshair'),
      hitmarker: document.getElementById('hitmarker'),
      dmgLayer: document.getElementById('dmgLayer'),
      armorLayer: document.getElementById('armorLayer'),
      hitFlash: document.getElementById('hitFlash'),
      clashFlash: document.getElementById('clashFlash'),
      speedLines: document.getElementById('speedLines'),
      fps: document.getElementById('fps'),
      coordHud: document.getElementById('coordHud'),
      stanceHud: document.getElementById('stanceHud'),
      modeHud: document.getElementById('modeHud'),
      compass: document.getElementById('compass'),
      compassStrip: document.getElementById('compassStrip'),
      compassCenter: document.getElementById('compassCenter'),
      compassDeg: document.getElementById('compassDeg'),
      toast: document.getElementById('toast'),
      vignette: document.getElementById('vignette'),
      hurtVignette: document.getElementById('hurtVignette'),
      pcHud: document.getElementById('pcHud'),
      backOverlay: document.getElementById('backOverlay'),
      backTitle: document.getElementById('backTitle'),
      backVersion: document.getElementById('backVersion'),
      hpHud: document.getElementById('healthHUD'),
      hpBody: document.getElementById('bodySvg'),
      hpText: document.getElementById('hpVal'),
      staminaText: document.getElementById('staminaVal'),
      hpStatus: document.getElementById('statusText'),
      hpLabel: document.querySelector('#healthInfo .lbl'),
      staminaLabel: document.querySelectorAll('#healthInfo .lbl')[1],
      statusLabel: document.getElementById('statusText'),
      vitalsHud: document.getElementById('vitalsHud'),
      vitalHeart: document.getElementById('vitalHeart'),
      vitalLung: document.getElementById('vitalLung'),
      heartWave: document.getElementById('heartWave'),
      lungWave: document.getElementById('lungWave'),
      heartVal: document.getElementById('heartVal'),
      lungVal: document.getElementById('lungVal'),
      deathScreen: document.getElementById('deathScreen'),
      killFeed: document.getElementById('killFeed'),
      playerNameHud: document.getElementById('playerNameHud'),
      backResume: document.getElementById('backResume'),
      backCharEdit: document.getElementById('backCharEdit'),
      backSettings: document.getElementById('backSettings'),
      backControls: document.getElementById('backControls'),
      backAbout: document.getElementById('backAbout'),
      backQuit: document.getElementById('backQuit')
    };

    var i;
    for(i = 0; i < this.heartWaveMax; i++) this.heartWaveBuf.push(0);
    for(i = 0; i < this.lungWaveMax; i++) this.lungWaveBuf.push(0);

    this._buildCompassCOD();
    this._applySettings();
    this._bindEvents();
    this._bindBackButton();
  },

  _bindEvents(){
    var self = this;
    TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, function(data){
      self._applySetting(data.key, data.value);
    });
    TBOX.Events.on(TBOX.EVENTS.SETTINGS_RESET, function(){
      self._applySettings();
    });
    window.addEventListener('message', function(e){
      if(!e.data) return;
      if(e.data.type === 'tbox-setting-changed'){
        self._applySetting(e.data.key, e.data.value);
      }
      if(e.data.type === 'tbox-settings-reset'){
        self._applySettings();
      }
    });
  },

  _bindBackButton(){
    var backBtn = document.getElementById('btnBackGame');
    if(!backBtn) return;
    backBtn.addEventListener('click', function(){
      TBOX.Engine.pause();
      TBOX.UI.showBackOverlay();
      if(!TBOX.Engine.isTouch && TBOX.Engine.controls && TBOX.Engine.controls.isLocked){
        TBOX.Engine.controls.unlock();
      }
    });
  },

  _applySetting(key, value){
    switch(key){
      case 'tbox_chStyle':
      case 'tbox_chColor':
      case 'tbox_chColorCustom':
      case 'tbox_chSize':
      case 'tbox_chThickness':
      case 'tbox_chGap':
      case 'tbox_chOpacity':
      case 'tbox_chDynamic':
      case 'tbox_chShadow':
        this._applyCrosshair(); break;

      case 'tbox_motionBlur':
      case 'tbox_filmGrain':
      case 'tbox_colorGrade':
      case 'tbox_colorSaturation':
      case 'tbox_colorContrast':
      case 'tbox_colorBrightness':
      case 'tbox_perfMode':
        if(TBOX.Engine && TBOX.Engine._applyPostProcessing) TBOX.Engine._applyPostProcessing();
        break;

      case 'tbox_vignette':
        if(this.els.vignette) this.els.vignette.style.opacity = value === '1' ? '1' : '0';
        break;
      case 'tbox_hudOpacity':
        this._applyHudOpacity(); break;
      case 'tbox_showCompass':
        if(this.els.compass) this.els.compass.style.display = value === '1' ? 'block' : 'none';
        if(this.els.compassDeg) this.els.compassDeg.style.display = value === '1' ? 'block' : 'none';
        break;
      case 'tbox_compassPos':
        this._applyCompassPos(); break;
      case 'tbox_compassOpacity':
        if(this.els.compass) this.els.compass.style.opacity = value / 100;
        if(this.els.compassDeg) this.els.compassDeg.style.opacity = value / 100;
        break;
      case 'tbox_showStance':
        if(this.els.stanceHud) this.els.stanceHud.style.display = value === '1' ? 'block' : 'none';
        break;
      case 'tbox_showCoord':
        if(this.els.coordHud) this.els.coordHud.style.display = value === '1' ? 'block' : 'none';
        break;
      case 'tbox_showfps':
        if(this.els.fps) this.els.fps.style.display = value === 'on' ? 'block' : 'none';
        break;
      case 'tbox_showCrosshair':
        this._applyCrosshair(); break;
      case 'tbox_showHp':
        if(this.els.hpHud) this.els.hpHud.style.display = value === '1' ? 'flex' : 'none';
        break;
      case 'tbox_vitals':
        if(this.els.vitalsHud) this.els.vitalsHud.style.display = value === '1' ? 'flex' : 'none';
        break;
      case 'tbox_fpsPos':
        this._applyFpsPos(); break;
      case 'tbox_fpsSize':
        this._applyFpsSize(); break;
      case 'tbox_hudScale':
        this._applyHudScale(); break;
    }
  },

  _applyFpsPos(){
    var pos = TBOX.Save.get('tbox_fpsPos', 'top-left');
    var f = this.els.fps;
    if(!f) return;
    f.style.left = f.style.right = f.style.top = f.style.bottom = 'auto';
    f.style.transform = 'none';
    if(pos === 'top-left'){ f.style.left = '14px'; f.style.top = '12px'; }
    else if(pos === 'top-center'){ f.style.left = '50%'; f.style.top = '12px'; f.style.transform = 'translateX(-50%)'; }
    else if(pos === 'top-right'){ f.style.right = '14px'; f.style.top = '12px'; }
    else if(pos === 'bottom-left'){ f.style.left = '14px'; f.style.bottom = '14px'; }
    else if(pos === 'bottom-center'){ f.style.left = '50%'; f.style.bottom = '14px'; f.style.transform = 'translateX(-50%)'; }
    else if(pos === 'bottom-right'){ f.style.right = '14px'; f.style.bottom = '14px'; }
    else if(pos === 'follow'){
      f.style.left = 'calc(50% + 40px)';
      f.style.top = 'calc(50% - 8px)';
    }
  },

  _applyFpsSize(){
    var size = TBOX.Save.getNum('tbox_fpsSize', 11);
    var f = this.els.fps;
    if(f) f.style.fontSize = size + 'px';
  },

  _applyCompassPos(){
    var pos = TBOX.Save.get('tbox_compassPos', 'top');
    var c = this.els.compass;
    var d = this.els.compassDeg;
    if(c){
      c.style.top = c.style.bottom = 'auto';
      if(pos === 'top'){ c.style.top = '10px'; }
      else { c.style.bottom = '10px'; c.style.top = 'auto'; }
    }
    if(d){
      d.style.top = d.style.bottom = 'auto';
      if(pos === 'top'){ d.style.top = '42px'; }
      else { d.style.bottom = '42px'; d.style.top = 'auto'; }
    }
  },

  _applyHudScale(){
    var scale = TBOX.Save.getNum('tbox_hudScale', 100) / 100;
    var hud = document.getElementById('healthHUD');
    var vit = document.getElementById('vitalsHud');
    if(hud) hud.style.transform = 'scale(' + (0.8 * scale) + ')';
    if(vit) vit.style.transform = 'scale(' + (0.8 * scale) + ')';
  },

  _applySettings(){
    this._applyCrosshair();
    this._applyHudOpacity();
    var v = TBOX.Save.get('tbox_vignette', '1');
    if(this.els.vignette) this.els.vignette.style.opacity = v === '1' ? '1' : '0';
    var c = TBOX.Save.get('tbox_showCompass', '1');
    if(this.els.compass) this.els.compass.style.display = c === '1' ? 'block' : 'none';
    if(this.els.compassDeg) this.els.compassDeg.style.display = c === '1' ? 'block' : 'none';
    this._applyCompassPos();
    var co = TBOX.Save.get('tbox_compassOpacity', 100) / 100;
    if(this.els.compass) this.els.compass.style.opacity = co;
    if(this.els.compassDeg) this.els.compassDeg.style.opacity = co;
    var s = TBOX.Save.get('tbox_showStance', '1');
    if(this.els.stanceHud) this.els.stanceHud.style.display = s === '1' ? 'block' : 'none';
    var cd = TBOX.Save.get('tbox_showCoord', '0');
    if(this.els.coordHud) this.els.coordHud.style.display = cd === '1' ? 'block' : 'none';
    var f = TBOX.Save.get('tbox_showfps', 'off');
    if(this.els.fps) this.els.fps.style.display = f === 'on' ? 'block' : 'none';
    var cros = TBOX.Save.get('tbox_showCrosshair', '1');
    if(this.els.crosshair) this.els.crosshair.style.display = cros === '1' ? 'block' : 'none';
    var hp = TBOX.Save.get('tbox_showHp', '1');
    if(this.els.hpHud) this.els.hpHud.style.display = hp === '1' ? 'flex' : 'none';
    var vv = TBOX.Save.get('tbox_vitals', '1');
    if(this.els.vitalsHud) this.els.vitalsHud.style.display = vv === '1' ? 'flex' : 'none';
    this._applyFpsPos();
    this._applyFpsSize();
    this._applyHudScale();
    this.updatePlayerName();
  },

  /* ============================================================
   * 准星
   * ============================================================ */
  _getChColor(){
    var color = TBOX.Save.get('tbox_chColor', 'white');
    var custom = TBOX.Save.get('tbox_chColorCustom', '#ffffff');
    var map = {
      white: '#ffffff', red: '#ff3b5c', green: '#4fff7a',
      yellow: '#ffcc33', blue: '#4fd1ff', cyan: '#00ffff', magenta: '#ff00ff'
    };
    return color === 'custom' ? custom : (map[color] || '#ffffff');
  },

  _buildCrosshairSvg(style, color, thickness, gap, spread){
    var c = color;
    var th = thickness || 2;
    var g = gap || 8;
    var mid = 16;
    var sp = spread || 0;
    var svg = '';

    switch(style){
      case 'cross':
        svg =
          '<line x1="16" y1="2" x2="16" y2="' + (mid - g - sp) + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="16" y1="' + (mid + g + sp) + '" x2="16" y2="30" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="2" y1="16" x2="' + (mid - g - sp) + '" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="' + (mid + g + sp) + '" y1="16" x2="30" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
        break;
      case 'dot':
        svg = '<circle cx="16" cy="16" r="' + (2.5 + sp * 0.1) + '" fill="' + c + '"/>';
        break;
      case 'circle':
        svg = '<circle cx="16" cy="16" r="' + (7 + sp) + '" fill="none" stroke="' + c + '" stroke-width="' + th + '"/>';
        break;
      case 'circle-dot':
        svg =
          '<circle cx="16" cy="16" r="' + (7 + sp) + '" fill="none" stroke="' + c + '" stroke-width="' + th + '"/>' +
          '<circle cx="16" cy="16" r="1.6" fill="' + c + '"/>';
        break;
      case 'cross-dot':
        var d = g + sp;
        svg =
          '<circle cx="16" cy="16" r="2" fill="' + c + '"/>' +
          '<circle cx="16" cy="' + (mid - d) + '" r="1.6" fill="' + c + '"/>' +
          '<circle cx="16" cy="' + (mid + d) + '" r="1.6" fill="' + c + '"/>' +
          '<circle cx="' + (mid - d) + '" cy="16" r="1.6" fill="' + c + '"/>' +
          '<circle cx="' + (mid + d) + '" cy="16" r="1.6" fill="' + c + '"/>';
        break;
      case 'x':
        var x1 = 6 - sp * 0.3;
        var x2 = 26 + sp * 0.3;
        var xin = mid - g * 0.7;
        var xin2 = mid + g * 0.7;
        svg =
          '<line x1="' + x1 + '" y1="' + x1 + '" x2="' + xin + '" y2="' + xin + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="' + xin2 + '" y1="' + xin2 + '" x2="' + x2 + '" y2="' + x2 + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="' + x2 + '" y1="' + x1 + '" x2="' + xin2 + '" y2="' + xin + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="' + x1 + '" y1="' + x2 + '" x2="' + xin + '" y2="' + xin2 + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
        break;
      case 'star':
        svg = '<path d="M16 3 L19 12 L28 12 L21 18 L24 27 L16 21 L8 27 L11 18 L4 12 L13 12 Z" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linejoin="round"/>';
        break;
      case 'star-filled':
        svg = '<path d="M16 3 L19 12 L28 12 L21 18 L24 27 L16 21 L8 27 L11 18 L4 12 L13 12 Z" fill="' + c + '"/>';
        break;
      case 'diamond':
        svg = '<path d="M16 4 L28 16 L16 28 L4 16 Z" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linejoin="round"/>';
        break;
      case 'square':
        svg = '<rect x="8" y="8" width="16" height="16" fill="none" stroke="' + c + '" stroke-width="' + th + '"/>';
        break;
      case 't-shape':
        svg =
          '<line x1="16" y1="2" x2="16" y2="' + (mid - g - sp) + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="2" y1="16" x2="' + (mid - g - sp) + '" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="' + (mid + g + sp) + '" y1="16" x2="30" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
        break;
      case 'brackets':
        svg =
          '<path d="M10 6 L6 6 L6 26 L10 26" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M22 6 L26 6 L26 26 L22 26" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round" stroke-linejoin="round"/>';
        break;
      default:
        svg = '<circle cx="16" cy="16" r="2" fill="' + c + '"/>';
    }
    return svg;
  },

  _applyCrosshair(){
    var ch = this.els.crosshair;
    if(!ch) return;
    var show = TBOX.Save.get('tbox_showCrosshair', '1') === '1';
    if(!show){ ch.style.display = 'none'; return; }
    ch.style.display = 'block';

    var style = TBOX.Save.get('tbox_chStyle', 'cross');
    var color = this._getChColor();
    var size = TBOX.Save.getNum('tbox_chSize', 100) / 100;
    var thickness = TBOX.Save.getNum('tbox_chThickness', 2);
    var gap = TBOX.Save.getNum('tbox_chGap', 8);
    var opacity = TBOX.Save.getNum('tbox_chOpacity', 100) / 100;

    var spread = TBOX.Save.get('tbox_chDynamic', '1') === '1' ? this._chSpread : 0;

    ch.setAttribute('viewBox', '0 0 32 32');
    var shadowDefs = TBOX.Save.get('tbox_chShadow', '1') === '1'
      ? '<defs><filter id="chShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#000" flood-opacity="0.85"/></filter></defs>'
      : '';

    ch.innerHTML = shadowDefs + '<g transform="translate(16 16) scale(' + size + ') translate(-16 -16)">' +
      this._buildCrosshairSvg(style, color, thickness, gap, spread) + '</g>';

    ch.style.opacity = String(opacity);
  },

  setCrosshairSpread(v){
    if(this._chSpread === v) return;
    this._chSpread = v;
    var dyn = TBOX.Save.get('tbox_chDynamic', '1') === '1';
    if(dyn) this._applyCrosshair();
  },

  hitCrosshair(kill){
    var ch = this.els.crosshair;
    if(!ch) return;
    ch.classList.remove('hit', 'kill');
    void ch.offsetWidth;
    ch.classList.add(kill ? 'kill' : 'hit');
    var my = ++this.crosshairToken;
    setTimeout(function(){
      if(my === TBOX.UI.crosshairToken) ch.classList.remove('hit', 'kill');
    }, kill ? 320 : 140);
  },

  _applyHudOpacity(){
    var o = TBOX.Save.getNum('tbox_hudOpacity', 100) / 100;
    if(this.els.pcHud) this.els.pcHud.style.opacity = String(o * 0.55);
  },

  /* ============================================================
   * 击中图标（40x40 坐标系）
   * ============================================================ */
  _buildHitSvg40(style){
    var th = 2.4;
    var c = '#fff';
    switch(style){
      case 'cross':
        return '<line x1="6" y1="6" x2="16" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="34" y1="6" x2="24" y2="16" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="6" y1="34" x2="16" y2="24" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="34" y1="34" x2="24" y2="24" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
      case 'x':
        return '<line x1="8" y1="8" x2="32" y2="32" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>' +
          '<line x1="32" y1="8" x2="8" y2="32" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
      case 'dot':
        return '<circle cx="20" cy="20" r="5" fill="' + c + '"/>';
      case 'circle':
        return '<circle cx="20" cy="20" r="10" fill="none" stroke="' + c + '" stroke-width="' + th + '"/>';
      case 'star':
        return '<path d="M20 4 L24 15 L36 15 L27 22 L30 34 L20 27 L10 34 L13 22 L4 15 L16 15 Z" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linejoin="round"/>';
      case 'diamond':
        return '<path d="M20 5 L35 20 L20 35 L5 20 Z" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linejoin="round"/>';
      case 'brackets':
        return '<path d="M12 8 L7 8 L7 32 L12 32" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M28 8 L33 8 L33 32 L28 32" fill="none" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'burst':
        var lines = '';
        for(var i = 0; i < 8; i++){
          var ang = (Math.PI * 2 / 8) * i;
          var x1 = 20 + Math.cos(ang) * 7;
          var y1 = 20 + Math.sin(ang) * 7;
          var x2 = 20 + Math.cos(ang) * 16;
          var y2 = 20 + Math.sin(ang) * 16;
          lines += '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" stroke="' + c + '" stroke-width="' + th + '" stroke-linecap="round"/>';
        }
        return lines;
      default:
        return '<circle cx="20" cy="20" r="4" fill="' + c + '"/>';
    }
  },

  showHitMarker(){
    var hm = this.els.hitmarker;
    if(!hm) return;
    /* 如果击中图标关了，不显示 */
    if(TBOX.Save.get('tbox_showDmgIcon', '1') !== '1'){
      return;
    }
    var style = TBOX.Save.get('tbox_hitStyle', 'cross');
    var size = TBOX.Save.getNum('tbox_hitSize', 100) / 100;
    var svgSize = 40;
    hm.setAttribute('viewBox', '0 0 40 40');
    hm.setAttribute('width', svgSize * size);
    hm.setAttribute('height', svgSize * size);
    hm.innerHTML = this._buildHitSvg40(style);
    hm.classList.remove('show');
    void hm.offsetWidth;
    hm.classList.add('show');
  },

  spawnHitIcon(worldPos, camera, isKill){
    if(TBOX.Save.get('tbox_showDmgIcon', '1') !== '1') return;
    var dl = this.els.dmgLayer;
    if(!dl || !camera) return;
    var v3 = new THREE.Vector3().copy(worldPos).project(camera);
    if(v3.z > 1) return;
    var x = (v3.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    if(!isFinite(x) || !isFinite(y)) return;

    var style = TBOX.Save.get('tbox_hitStyle', 'cross');
    var sizeScale = TBOX.Save.getNum('tbox_hitSize', 100) / 100;
    var floatH = TBOX.Save.getNum('tbox_hitFloat', 60);

    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.pointerEvents = 'none';
    el.style.willChange = 'transform,opacity';
    var svgW = 40 * sizeScale;
    el.innerHTML = '<svg width="' + svgW + '" height="' + svgW + '" viewBox="0 0 40 40" style="display:block;filter:drop-shadow(0 0 3px #000);">' +
      this._buildHitSvg40(style) + '</svg>';
    if(isKill) el.style.filter = 'brightness(1.4) drop-shadow(0 0 6px #ff3b5c)';
    dl.appendChild(el);

    var start = performance.now();
    var dur = 500;
    var dx = (Math.random() - 0.5) * 10;
    function tick(now){
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var scale = 1 + e * 0.6;
      el.style.transform = 'translate(-50%,-50%) translate(' + (dx * e) + 'px, ' + (-floatH * e) + 'px) scale(' + scale + ')';
      el.style.opacity = String(1 - e);
      if(p < 1) requestAnimationFrame(tick); else el.remove();
    }
    requestAnimationFrame(tick);
  },

  flashHit(strength){
    var hf = this.els.hitFlash;
    if(!hf) return;
    hf.style.opacity = String(strength);
    var my = ++this.hitFlashToken;
    setTimeout(function(){
      if(my === TBOX.UI.hitFlashToken) hf.style.opacity = '0';
    }, 90);
  },

  flashClash(){
    var cf = this.els.clashFlash;
    if(!cf) return;
    cf.style.opacity = '1';
    setTimeout(function(){ cf.style.opacity = '0'; }, 120);
  },

  flashHurt(amount){
    var hv = this.els.hurtVignette;
    if(!hv) return;
    if(TBOX.Player && TBOX.Player.dead) return;
    hv.style.opacity = String(Math.min(1, 0.3 + amount * 0.06));
    setTimeout(function(){
      if(!TBOX.Player || !TBOX.Player.dead){
        hv.style.opacity = '0';
      }
    }, 200);
  },

  setSpeedLines(v){
    var sl = this.els.speedLines;
    if(!sl) return;
    var enabled = TBOX.Save.get('tbox_speedlines', '1') === '1';
    sl.style.opacity = String(enabled ? v * 0.9 : 0);
  },

  spawnDamageNumber(worldPos, value, camera, isKill){
    if(TBOX.Save.get('tbox_showDmgNumber', '1') !== '1') return;
    var dl = this.els.dmgLayer;
    if(!dl || !camera) return;
    var v3 = new THREE.Vector3().copy(worldPos).project(camera);
    if(v3.z > 1) return;
    var x = (v3.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    if(!isFinite(x) || !isFinite(y)) return;
    var sizeScale = TBOX.Save.getNum('tbox_dmgSize', 100) / 100;
    var el = document.createElement('div');
    el.className = 'dmg';
    var colorMap = { normal: '#ffffff', crit: '#ffcc33', kill: '#ff3b5c' };
    var color = isKill ? colorMap.kill : (value >= 3 ? colorMap.crit : colorMap.normal);
    el.textContent = String(value);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.style.fontSize = (26 + Math.min(22, value * 4)) * sizeScale + 'px';
    el.style.textShadow = '0 0 8px ' + color + ', 0 2px 5px rgba(0,0,0,.9)';
    dl.appendChild(el);
    var start = performance.now();
    var dur = 720;
    var dx = (Math.random() - 0.5) * 44;
    function tick(now){
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.style.transform = 'translate(-50%,-50%) translate(' + (dx * e) + 'px, ' + (-72 * e) + 'px) scale(' + (1 + 0.28 * (1 - p)) + ')';
      el.style.opacity = String(1 - e);
      if(p < 1) requestAnimationFrame(tick); else el.remove();
    }
    requestAnimationFrame(tick);
  },

  spawnArmorBreak(worldPos, camera){
    var al = this.els.armorLayer;
    if(!al || !camera) return;
    var v3 = new THREE.Vector3().copy(worldPos).project(camera);
    if(v3.z > 1) return;
    var x = (v3.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    if(!isFinite(x) || !isFinite(y)) return;
    var el = document.createElement('div');
    el.className = 'armor';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    al.appendChild(el);
    el.classList.add('show');
    setTimeout(function(){ el.remove(); }, 340);
  },

  addKillFeed(killer, victim, weapon){
    var feed = this.els.killFeed;
    if(!feed) return;
    var row = document.createElement('div');
    row.className = 'kill-row';
    row.innerHTML =
      '<span class="killer">' + (killer || '未知') + '</span>' +
      '<span class="arrow">→</span>' +
      '<span class="victim">' + (victim || '未知') + '</span>' +
      (weapon ? '<span class="weapon">' + weapon + '</span>' : '');
    feed.appendChild(row);
    while(feed.children.length > this.killFeedMax){
      feed.removeChild(feed.firstChild);
    }
    setTimeout(function(){
      row.classList.add('fade');
      setTimeout(function(){
        if(row.parentNode) row.parentNode.removeChild(row);
      }, 400);
    }, 3000);
  },

  updatePlayerName(){
    var el = this.els.playerNameHud;
    if(!el) return;
    var cfg = TBOX.Save.get('tbox_charConfig', null);
    if(cfg){
      try {
        var parsed = JSON.parse(cfg);
        el.textContent = parsed.name || 'Player';
        return;
      } catch(e){}
    }
    el.textContent = 'Player';
  },

  _buildCompassCOD(){
    var strip = this.els.compassStrip;
    if(!strip) return;
    strip.innerHTML = '';
    this._compass.nodePool = [];
    for(var i = 0; i < 60; i++){
      var el = document.createElement('div');
      el.className = 'dir';
      el.style.display = 'none';
      strip.appendChild(el);
      this._compass.nodePool.push(el);
    }
    this._compass.collectPool = [];
    for(var j = 0; j < 80; j++){
      this._compass.collectPool.push({ deg: 0, type: '', def: null });
    }
    this._compass.collectCount = 0;
    this._compass.lastRenderYaw = null;
  },

  updateCompass(yaw){
    var strip = this.els.compassStrip;
    if(!strip) return;

    var yawDeg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
    var C = this._compass;
    var visible = C.visibleDeg;
    var half = visible / 2;
    var pxPerDeg = C.pxPerDeg;
    var pool = C.nodePool;
    var poolIdx = 0;
    var collect = C.collectPool;
    var collectCount = 0;

    var startDeg = yawDeg - half;
    var endDeg = yawDeg + half;

    for(var d = 0; d < 360; d += 45){
      for(var k = -2; k <= 2; k++){
        var degK = d + k * 360;
        if(degK >= startDeg && degK <= endDeg){
          var dirDef = null;
          for(var di = 0; di < C.dirs.length; di++){
            if(C.dirs[di].deg === d){ dirDef = C.dirs[di]; break; }
          }
          if(dirDef && collectCount < collect.length){
            var c = collect[collectCount++];
            c.deg = degK; c.type = 'main'; c.def = dirDef;
          }
        }
      }
    }

    var step15 = Math.ceil(startDeg / 15) * 15;
    for(var dd = step15; dd <= endDeg; dd += 15){
      var m = ((dd % 360) + 360) % 360;
      if(m % 45 === 0) continue;
      if(collectCount < collect.length){
        var c2 = collect[collectCount++];
        c2.deg = dd; c2.type = 'mid'; c2.def = null;
      }
    }

    var step5 = Math.ceil(startDeg / 5) * 5;
    for(var d5 = step5; d5 <= endDeg; d5 += 5){
      var m5 = ((d5 % 360) + 360) % 360;
      if(m5 % 15 === 0) continue;
      if(collectCount < collect.length){
        var c3 = collect[collectCount++];
        c3.deg = d5; c3.type = 'small'; c3.def = null;
      }
    }

    var centerPx = visible * pxPerDeg / 2;

    for(var p = 0; p < pool.length; p++) pool[p].style.display = 'none';

    for(var ci = 0; ci < collectCount; ci++){
      var item = collect[ci];
      if(poolIdx >= pool.length) break;
      var el = pool[poolIdx++];
      var xPx = centerPx + (item.deg - yawDeg) * pxPerDeg;

      if(item.type === 'main'){
        el.className = 'dir';
        el.innerHTML = item.def.label + '<span class="num">' + item.def.num + '</span>';
        el.style.left = xPx + 'px';
        el.style.display = 'flex';
      } else if(item.type === 'mid'){
        el.className = 'dir sub';
        el.innerHTML = '<span class="tick mid"></span>';
        el.style.left = xPx + 'px';
        el.style.display = 'flex';
      } else {
        el.className = 'dir sub';
        el.innerHTML = '<span class="tick"></span>';
        el.style.left = xPx + 'px';
        el.style.display = 'flex';
      }
    }

    if(this.els.compassDeg){
      this.els.compassDeg.textContent = String(Math.round(yawDeg)).padStart(3, '0') + '°';
    }

    C.collectCount = collectCount;
    C.lastRenderYaw = yawDeg;
  },

  updateFPS(fps){ if(this.els.fps) this.els.fps.textContent = 'FPS ' + fps; },
  updateCoord(p){
    if(this.els.coordHud) this.els.coordHud.textContent = 'X: ' + p.x.toFixed(1) + ' Y: ' + p.y.toFixed(1) + ' Z: ' + p.z.toFixed(1);
  },

  updateStance(state){
    if(!this.els.stanceHud) return;
    var map = {
      idle: '状态 · 待机', walk: '状态 · 行走', run: '状态 · 奔跑',
      sprint: '状态 · 冲刺', climb: '状态 · 攀爬', dead: '死亡',
      block: '状态 · 格挡', dodge: '状态 · 闪避'
    };
    this.els.stanceHud.textContent = map[state] || '状态 · 待机';
  },

  updateMode(mode){
    if(!this.els.modeHud) return;
    this.els.modeHud.textContent = mode === 'tps' ? '视角 · 第三人称' : '视角 · 第一人称';
  },

  updateHpHud(p){
    if(!p) return;
    var showHp = TBOX.Save.get('tbox_showHp', '1') === '1';
    if(this.els.hpHud) this.els.hpHud.style.display = showHp ? 'flex' : 'none';
    if(!showHp) return;

    var hp = Math.max(0, Math.round(p.hp));
    var maxHp = p.maxHp || 100;
    var sta = Math.max(0, Math.round(p.stamina));
    var maxSta = p.maxStamina || 100;

    var pct = hp / maxHp * 100;
    var color = '#ffffff';
    var status = '良好';

    if(pct >= 70){ color = '#ffffff'; status = '良好'; }
    else if(pct >= 40){ color = '#ffcc33'; status = '轻伤'; }
    else if(pct > 0){ color = '#ff3b5c'; status = '重伤'; }
    else { color = '#000000'; status = '死亡'; }

    var svg = this.els.hpBody;
    if(svg){
      var parts = svg.querySelectorAll('.body-part, rect');
      for(var i = 0; i < parts.length; i++){
        parts[i].setAttribute('fill', color);
        parts[i].setAttribute('stroke', pct <= 0 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)');
      }
    }

    if(this.els.hpText) this.els.hpText.textContent = hp + ' / ' + maxHp;
    if(this.els.staminaText) this.els.staminaText.textContent = sta + ' / ' + maxSta;
    if(this.els.hpStatus) this.els.hpStatus.textContent = status;
    if(this.els.hpText) this.els.hpText.style.color = color === '#000000' ? '#666' : color;
    if(this.els.hpStatus) this.els.hpStatus.style.color = color === '#000000' ? '#666' : color;

    if(this.els.hpLabel) this.els.hpLabel.textContent = '血量';
    if(this.els.staminaLabel) this.els.staminaLabel.textContent = '耐力';
  },

  updateHurtVignette(p){
    var hv = this.els.hurtVignette;
    if(!hv || !p) return;
    if(p.dead) return;
    if(TBOX.Save.get('tbox_hurtVignette', '1') !== '1'){
      hv.style.opacity = '0';
      return;
    }
    var pct = p.hp / (p.maxHp || 100) * 100;
    var opacity = 0;
    if(pct >= 70) opacity = 0;
    else if(pct >= 40) opacity = 0.2;
    else if(pct > 0) opacity = 0.5 + (40 - pct) / 40 * 0.4;
    else opacity = 1;
    if(pct > 0 && pct < 20){
      opacity *= 0.6 + 0.4 * Math.abs(Math.sin(performance.now() * 0.005));
    }
    hv.style.opacity = String(opacity);
  },

  updateVitals(vitals, p){
    if(!vitals || !p) return;
    var heartPhase = vitals.heartPhase;
    var lungPhase = vitals.lungPhase;
    var ecgVal = this._ecgSample(heartPhase);
    var lungVal = Math.sin(lungPhase * Math.PI * 2);
    this.heartWaveBuf.push(ecgVal);
    this.lungWaveBuf.push(lungVal);
    if(this.heartWaveBuf.length > this.heartWaveMax) this.heartWaveBuf.shift();
    if(this.lungWaveBuf.length > this.lungWaveMax) this.lungWaveBuf.shift();
    this._drawWave('heartWave', this.heartWaveBuf, 24, 1);
    this._drawWave('lungWave', this.lungWaveBuf, 24, 0.8);
    if(this.els.heartVal) this.els.heartVal.textContent = String(Math.round(vitals.heart));
    if(this.els.lungVal) this.els.lungVal.textContent = String(Math.round(vitals.lung));
    var critical = p.hp < TBOX.DATA.VITALS.criticalHp;
    if(this.els.vitalHeart){
      if(critical) this.els.vitalHeart.classList.add('critical');
      else this.els.vitalHeart.classList.remove('critical');
    }
  },

  _ecgSample(phase){
    if(phase < 0.10) return 0;
    if(phase < 0.15) return 0.15 * Math.sin((phase - 0.10) / 0.05 * Math.PI);
    if(phase < 0.25) return 0;
    if(phase < 0.27) return -0.3 * Math.sin((phase - 0.25) / 0.02 * Math.PI);
    if(phase < 0.32) return 1.0 * Math.sin((phase - 0.27) / 0.05 * Math.PI);
    if(phase < 0.40) return 0;
    if(phase < 0.55) return 0.25 * Math.sin((phase - 0.40) / 0.15 * Math.PI);
    return 0;
  },

  _drawWave(id, buffer, height, ampScale){
    var path = document.getElementById(id);
    if(!path) return;
    var w = 120, h = height;
    var n = buffer.length;
    if(n < 2) return;
    var d = '';
    for(var i = 0; i < n; i++){
      var x = (i / (n - 1)) * w;
      var y = h / 2 - buffer[i] * (h / 2) * ampScale;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    path.setAttribute('d', d);
  },

  toast(msg, ms){
    var t = this.els.toast;
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function(){ t.classList.remove('show'); }, ms || 1800);
  },

  showBackOverlay(){
    var ov = this.els.backOverlay;
    if(!ov) return;
    ov.classList.add('on');
    if(this.els.backTitle) this.els.backTitle.textContent = 'T-BOX';
    if(this.els.backVersion) this.els.backVersion.textContent = TBOX.DATA.VERSION_LABEL || 'V1.0.0 · STABLE';
  },
  hideBackOverlay(){
    var ov = this.els.backOverlay;
    if(!ov) return;
    ov.classList.remove('on');
  },
  isBackOverlayOpen(){
    var ov = this.els.backOverlay;
    return ov && ov.classList.contains('on');
  },

  showDeathScreen(){
    var ds = this.els.deathScreen;
    if(!ds) return;
    ds.style.display = 'block';
    ds.style.opacity = '0';
    requestAnimationFrame(function(){ ds.style.opacity = '1'; });
  },
  hideDeathScreen(){
    var ds = this.els.deathScreen;
    if(!ds) return;
    ds.style.opacity = '0';
    setTimeout(function(){ ds.style.display = 'none'; }, 300);
  }
};