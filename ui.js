/* ============================================================
 * ui.js · UI 系统
 * 人体 HUD、心跳/呼吸检测仪、准星、罗盘、伤害数字、
 * 击杀提示、返回页面、死亡屏
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

  /* ★ 击杀提示队列 */
  killFeed: [],
  killFeedMax: 5,

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
      hpLabel: document.querySelector('#healthInfo .lbl[data-i18n="hpText"]'),
      staminaLabel: document.querySelector('#healthInfo .lbl[data-i18n="staminaText"]'),
      statusLabel: document.getElementById('statusText'),
      vitalsHud: document.getElementById('vitalsHud'),
      vitalHeart: document.getElementById('vitalHeart'),
      vitalLung: document.getElementById('vitalLung'),
      heartWave: document.getElementById('heartWave'),
      lungWave: document.getElementById('lungWave'),
      heartVal: document.getElementById('heartVal'),
      lungVal: document.getElementById('lungVal'),
      deathScreen: document.getElementById('deathScreen'),
      /* ★ 击杀提示 */
      killFeed: document.getElementById('killFeed'),
      /* ★ 主角名字显示 */
      playerNameHud: document.getElementById('playerNameHud')
    };

    var i;
    for(i = 0; i < this.heartWaveMax; i++) this.heartWaveBuf.push(0);
    for(i = 0; i < this.lungWaveMax; i++) this.lungWaveBuf.push(0);

    this._buildCompass();
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
      case 'tbox_chSize':
      case 'tbox_chOpacity':
        this._applyCrosshair(); break;
      case 'tbox_vignette':
        if(this.els.vignette) this.els.vignette.style.opacity = value === '1' ? '1' : '0';
        break;
      case 'tbox_hudOpacity':
        this._applyHudOpacity(); break;
      case 'tbox_showCompass':
        if(this.els.compass) this.els.compass.style.display = value === '1' ? 'block' : 'none';
        if(this.els.compassDeg) this.els.compassDeg.style.display = value === '1' ? 'block' : 'none';
        break;
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
        if(this.els.crosshair) this.els.crosshair.style.display = value === '1' ? 'block' : 'none';
        break;
      case 'tbox_showHp':
        if(this.els.hpHud) this.els.hpHud.style.display = value === '1' ? 'flex' : 'none';
        break;
      case 'tbox_vitals':
        if(this.els.vitalsHud) this.els.vitalsHud.style.display = value === '1' ? 'flex' : 'none';
        break;
      case 'tbox_lang':
        this.applyLang(); break;
    }
  },

  _applySettings(){
    this._applyCrosshair();
    this._applyHudOpacity();
    var v = TBOX.Save.get('tbox_vignette', '1');
    if(this.els.vignette) this.els.vignette.style.opacity = v === '1' ? '1' : '0';
    var c = TBOX.Save.get('tbox_showCompass', '1');
    if(this.els.compass) this.els.compass.style.display = c === '1' ? 'block' : 'none';
    if(this.els.compassDeg) this.els.compassDeg.style.display = c === '1' ? 'block' : 'none';
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
    this.applyLang();
    this.updatePlayerName();
  },

  /* ============================================================
   * 准星
   * ============================================================ */
  _applyCrosshair(){
    var ch = this.els.crosshair;
    if(!ch) return;
    var style = TBOX.Save.get('tbox_chStyle', 'cross');
    var color = TBOX.Save.get('tbox_chColor', 'white');
    var size = TBOX.Save.getNum('tbox_chSize', 100) / 100;
    var opacity = TBOX.Save.getNum('tbox_chOpacity', 100) / 100;

    ch.setAttribute('viewBox', '0 0 32 32');
    ch.innerHTML = '';
    var c = 'currentColor';

    if(style === 'dot'){
      ch.innerHTML = '<circle cx="16" cy="16" r="' + (2.2 * size) + '" fill="' + c + '"/>';
    } else if(style === 'circle'){
      ch.innerHTML =
        '<circle cx="16" cy="16" r="' + (7 * size) + '" fill="none" stroke="' + c + '" stroke-width="2"/>' +
        '<circle cx="16" cy="16" r="' + (1.4 * size) + '" fill="' + c + '"/>';
    } else if(style === 'cross-dot'){
      ch.innerHTML =
        '<line x1="16" y1="2" x2="16" y2="' + (9 * size) + '" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="16" y1="' + (32 - 9 * size) + '" x2="16" y2="30" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="2" y1="16" x2="' + (9 * size) + '" y2="16" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="' + (32 - 9 * size) + '" y1="16" x2="30" y2="16" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="16" cy="16" r="' + (1.4 * size) + '" fill="' + c + '"/>';
    } else {
      ch.innerHTML =
        '<line x1="16" y1="2" x2="16" y2="' + (9 * size) + '" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="16" y1="' + (32 - 9 * size) + '" x2="16" y2="30" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="2" y1="16" x2="' + (9 * size) + '" y2="16" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<line x1="' + (32 - 9 * size) + '" y1="16" x2="30" y2="16" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="16" cy="16" r="' + (1.4 * size) + '" fill="' + c + '"/>';
    }

    var colorMap = {
      white: '#ffffff', red: '#ff3b5c', green: '#4fff7a',
      yellow: '#ffcc33', blue: '#4fd1ff', cyan: '#00ffff', magenta: '#ff00ff'
    };
    ch.style.color = colorMap[color] || '#ffffff';
    ch.style.opacity = String(opacity);
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

  showHitMarker(){
    var hm = this.els.hitmarker;
    if(!hm) return;
    var size = TBOX.Save.getNum('tbox_hitSize', 100) / 100;
    hm.setAttribute('width', 40 * size);
    hm.setAttribute('height', 40 * size);
    hm.classList.remove('show');
    void hm.offsetWidth;
    hm.classList.add('show');
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

  /* ============================================================
   * 伤害数字 / 破甲
   * ============================================================ */
  spawnDamageNumber(worldPos, value, camera, isKill){
    var dl = this.els.dmgLayer;
    if(!dl || !camera) return;
    var v3 = new THREE.Vector3().copy(worldPos).project(camera);
    if(v3.z > 1) return;
    var x = (v3.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-v3.y * 0.5 + 0.5) * window.innerHeight;
    if(!isFinite(x) || !isFinite(y)) return;
    var style = TBOX.Save.get('tbox_dmgStyle', 'number');
    if(style === 'off') return;
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

  /* ============================================================
   * ★ 击杀提示
   * ============================================================ */
  addKillFeed(killer, victim, weapon){
    var feed = this.els.killFeed;
    if(!feed) return;

    var row = document.createElement('div');
    row.className = 'kill-row';
    row.innerHTML =
      '<span class="killer">' + (killer || 'Unknown') + '</span>' +
      '<span class="arrow">→</span>' +
      '<span class="victim">' + (victim || 'Unknown') + '</span>' +
      (weapon ? '<span class="weapon">' + weapon + '</span>' : '');
    feed.appendChild(row);

    /* 限制条数 */
    while(feed.children.length > this.killFeedMax){
      feed.removeChild(feed.firstChild);
    }

    /* 3 秒后淡出移除 */
    var self = this;
    setTimeout(function(){
      row.classList.add('fade');
      setTimeout(function(){
        if(row.parentNode) row.parentNode.removeChild(row);
      }, 400);
    }, 3000);
  },

  /* ============================================================
   * 主角名字显示
   * ============================================================ */
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

  /* ============================================================
   * 罗盘
   * ============================================================ */
  _buildCompass(){
    var strip = this.els.compassStrip;
    if(!strip) return;
    strip.innerHTML = '';
    var PX_PER_DEG = 5;
    var LOOPS = 2;
    strip.style.width = (360 * LOOPS * PX_PER_DEG) + 'px';
    for(var loop = 0; loop < LOOPS; loop++){
      var base = loop * 360;
      for(var d = 0; d < 360; d += 5){
        var deg = base + d;
        var tick = document.createElement('div');
        var cls = 'tick';
        if(d % 45 === 0) cls += ' big';
        else if(d % 15 === 0) cls += ' mid';
        tick.className = cls;
        tick.style.left = (deg * PX_PER_DEG) + 'px';
        strip.appendChild(tick);
      }
      for(var d2 = 0; d2 < 360; d2 += 15){
        if(d2 % 45 === 0) continue;
        var deg2 = base + d2;
        var num = document.createElement('div');
        num.className = 'dir';
        num.style.left = (deg2 * PX_PER_DEG) + 'px';
        num.innerHTML = '<span class="num">' + String(d2).padStart(3, '0') + '</span>';
        strip.appendChild(num);
      }
      var DIRS = [
        { deg: 0, label: 'N', num: '000' }, { deg: 45, label: 'NE', num: '045' },
        { deg: 90, label: 'E', num: '090' }, { deg: 135, label: 'SE', num: '135' },
        { deg: 180, label: 'S', num: '180' }, { deg: 225, label: 'SW', num: '225' },
        { deg: 270, label: 'W', num: '270' }, { deg: 315, label: 'NW', num: '315' }
      ];
      for(var k = 0; k < DIRS.length; k++){
        var dir = DIRS[k];
        var deg3 = base + dir.deg;
        var el = document.createElement('div');
        el.className = 'dir main';
        el.style.left = (deg3 * PX_PER_DEG) + 'px';
        el.innerHTML = dir.label + '<span class="num">' + dir.num + '</span>';
        strip.appendChild(el);
      }
    }
    this._compassAcc = 0;
    this._lastYaw = 0;
    this._pxPerDeg = PX_PER_DEG;
  },

  updateCompass(yaw){
    var strip = this.els.compassStrip;
    if(!strip) return;
    var delta = (yaw - this._lastYaw) * 180 / Math.PI;
    this._lastYaw = yaw;
    this._compassAcc += -delta;
    while(this._compassAcc >= 720) this._compassAcc -= 360;
    while(this._compassAcc < 0) this._compassAcc += 360;
    var curPx = this._compassAcc * this._pxPerDeg;
    var containerW = strip.parentElement.clientWidth;
    var offset = -(curPx) + containerW / 2;
    strip.style.transform = 'translateX(' + offset + 'px)';
    var showDeg = ((this._compassAcc % 360) + 360) % 360;
    if(this.els.compassDeg) this.els.compassDeg.textContent = String(Math.round(showDeg)).padStart(3, '0') + '°';
  },

  /* ============================================================
   * HUD 更新
   * ============================================================ */
  updateFPS(fps){
    if(this.els.fps) this.els.fps.textContent = 'FPS ' + fps;
  },
  updateCoord(p){
    if(this.els.coordHud) this.els.coordHud.textContent = 'X: ' + p.x.toFixed(1) + ' Y: ' + p.y.toFixed(1) + ' Z: ' + p.z.toFixed(1);
  },
  updateStance(state){
    if(!this.els.stanceHud) return;
    var lang = TBOX.Save.get('tbox_lang', 'zh');
    var T = TBOX.DATA.TEXT[lang] || TBOX.DATA.TEXT.zh;
    var map = {
      idle: T.stanceIdle, walk: T.stanceWalk, run: T.stanceRun,
      sprint: T.stanceSprint, crouchIdle: T.stanceCrouch,
      crouchWalk: T.stanceCrouch, climb: T.stanceClimb, dead: T.hpDead,
      block: T.stanceBlock || 'STANCE · BLOCK',
      dodge: T.stanceDodge || 'STANCE · DODGE'
    };
    this.els.stanceHud.textContent = map[state] || T.stanceIdle;
  },
  updateMode(mode){
    if(!this.els.modeHud) return;
    var lang = TBOX.Save.get('tbox_lang', 'zh');
    var T = TBOX.DATA.TEXT[lang] || TBOX.DATA.TEXT.zh;
    this.els.modeHud.textContent = mode === 'tps' ? T.camTps : T.camFps;
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
    var T = TBOX.DATA.TEXT[TBOX.Save.get('tbox_lang', 'zh')] || TBOX.DATA.TEXT.zh;

    if(pct >= 70){ color = '#ffffff'; status = T.hpGood; }
    else if(pct >= 40){ color = '#ffcc33'; status = T.hpLight; }
    else if(pct > 0){ color = '#ff3b5c'; status = T.hpHeavy; }
    else { color = '#000000'; status = T.hpDead; }

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

    if(this.els.hpLabel) this.els.hpLabel.textContent = T.hpText;
    if(this.els.staminaLabel) this.els.staminaLabel.textContent = T.staminaText;
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

  /* ============================================================
   * 心跳 / 呼吸检测仪
   * ============================================================ */
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

  /* ============================================================
   * Toast
   * ============================================================ */
  toast(msg, ms){
    var t = this.els.toast;
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function(){ t.classList.remove('show'); }, ms || 1800);
  },

  /* ============================================================
   * 返回页面
   * ============================================================ */
  showBackOverlay(){
    var ov = this.els.backOverlay;
    if(!ov) return;
    ov.classList.add('on');
    if(this.els.backTitle) this.els.backTitle.textContent = 'T-BOX';
    if(this.els.backVersion) this.els.backVersion.textContent = TBOX.DATA.VERSION_LABEL || 'V1.0.0 · Stable';
    this.applyLang();
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

  /* ============================================================
   * 死亡屏
   * ============================================================ */
  showDeathScreen(){
    var ds = this.els.deathScreen;
    if(!ds) return;
    ds.style.display = 'block';
    ds.style.opacity = '0';
    requestAnimationFrame(function(){
      ds.style.opacity = '1';
    });
  },
  hideDeathScreen(){
    var ds = this.els.deathScreen;
    if(!ds) return;
    ds.style.opacity = '0';
    setTimeout(function(){ ds.style.display = 'none'; }, 300);
  },

  /* ============================================================
   * 语言
   * ============================================================ */
  applyLang(){
    var lang = TBOX.Save.get('tbox_lang', 'zh');
    var T = TBOX.DATA.TEXT[lang] || TBOX.DATA.TEXT.zh;

    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.dataset.i18n;
      if(T[key] === undefined) return;
      var textNode = null;
      for(var i = 0; i < el.childNodes.length; i++){
        var node = el.childNodes[i];
        if(node.nodeType === 3 && node.nodeValue.trim()){
          textNode = node; break;
        }
      }
      if(textNode) textNode.nodeValue = T[key];
      else el.textContent = T[key];
    });

    if(this.els.pcHud) this.els.pcHud.innerHTML = T.pcHud;

    var backMenuSpan = document.querySelector('#btnBackGame span[data-i18n="backMenu"]');
    if(backMenuSpan) backMenuSpan.textContent = T.backMenu;

    var backResume = document.getElementById('backResume');
    var backQuit = document.getElementById('backQuit');
    var backSettings = document.getElementById('backSettings');
    var backControls = document.getElementById('backControls');
    var backAbout = document.getElementById('backAbout');
    if(backResume) backResume.textContent = T.backResume;
    if(backQuit) backQuit.textContent = T.backQuit;
    if(backSettings) backSettings.textContent = T.backSettings;
    if(backControls) backControls.textContent = T.backControls;
    if(backAbout) backAbout.textContent = T.backAbout;

    if(this.els.backTitle) this.els.backTitle.textContent = 'T-BOX';
    if(this.els.backVersion) this.els.backVersion.textContent = TBOX.DATA.VERSION_LABEL || 'V1.0.0 · Stable';

    if(this.els.modeHud){
      var mode = TBOX.Engine.camState ? TBOX.Engine.camState.mode : 'fps';
      this.els.modeHud.textContent = mode === 'tps' ? T.camTps : T.camFps;
    }

    var btnMap = {
      btnJab: 'btnJab', btnHook: 'btnHook', btnElbowL: 'btnElbowL', btnElbowR: 'btnElbowR',
      btnLeftKick: 'btnLeftKick', btnRightKick: 'btnRightKick', btnBackSpin: 'btnBackSpin',
      btnCrouch: 'btnCrouch', btnSprint: 'btnSprint', btnKnee: 'btnKnee',
      btnCross: 'btnCross', btnHookR: 'btnHookR', btnClimb: 'btnClimb',
      btnHammer: 'btnHammer', btnPalm: 'btnPalm', btnJump: 'btnJump',
      btnInspect: 'btnInspect', btnView: 'btnView',
      btnBlock: 'btnBlock'
    };
    for(var id in btnMap){
      var el = document.getElementById(id);
      if(!el) continue;
      var sub = el.querySelector('.sub');
      if(sub && T[btnMap[id]]) sub.textContent = T[btnMap[id]];
    }

    if(this.els.hpLabel) this.els.hpLabel.textContent = T.hpText;
    if(this.els.staminaLabel) this.els.staminaLabel.textContent = T.staminaText;
  }
};