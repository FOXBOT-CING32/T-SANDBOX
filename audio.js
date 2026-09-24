/* ============================================================
 * audio.js · 音效系统
 * 网络音效（Pixabay）+ 合成音效（Web Audio）混合
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Audio = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  ambientGain: null,
  enabled: false,
  initialized: false,

  /* 网络音效池 */
  net: {},
  netLoaded: false,
  ambientNodes: [],

  /* ============================================================
   * 初始化
   * ============================================================ */
  init(){
    if(this.initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC){ console.warn('Web Audio API 不支持'); return; }
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);

      const m = TBOX.Save.getNum('tbox_volMaster', 70) / 100;
      const s = TBOX.Save.getNum('tbox_volSfx', 70) / 100;
      this.masterGain.gain.value = m;
      this.sfxGain.gain.value = s;
      this.ambientGain.gain.value = 0.35;
      this.enabled = true;
      this.initialized = true;

      /* 异步加载网络音效 */
      this._loadNetwork();
    } catch(e){ console.warn('Audio init fail', e); }
  },

  /* ============================================================
   * 网络音效加载
   * ============================================================ */
  _loadNetwork(){
    if(this.netLoaded) return;
    const list = (TBOX.DATA.NET_AUDIO) || {};
    let count = 0;
    let total = 0;
    for(const k in list){ if(list[k]) total++; }
    if(total === 0){ this.netLoaded = true; return; }

    for(const key in list){
      const url = list[key];
      if(!url) continue;
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.addEventListener('canplaythrough', () => {
        count++;
        if(count >= total) this.netLoaded = true;
      });
      audio.addEventListener('error', () => {
        count++;
        if(count >= total) this.netLoaded = true;
        console.warn('音效加载失败:', key);
      });
      this.net[key] = audio;
    }
  },

  /* ============================================================
   * 恢复（用户交互后）
   * ============================================================ */
  resume(){
    if(this.ctx && this.ctx.state === 'suspended'){
      this.ctx.resume();
    }
  },

  /* ============================================================
   * 音量
   * ============================================================ */
  setMasterVolume(v){
    if(this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  },
  setSfxVolume(v){
    if(this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
  },
  setAmbientVolume(v){
    if(this.ambientGain) this.ambientGain.gain.value = Math.max(0, Math.min(1, v));
  },

  /* ============================================================
   * 网络音效播放
   * ============================================================ */
  playNet(key, volume){
    if(!this.enabled) return;
    const src = this.net[key];
    if(!src) return;
    try {
      const clone = src.cloneNode();
      clone.volume = volume !== undefined ? volume : 0.6;
      clone.play().catch(() => {});
    } catch(e){}
  },

  /* ============================================================
   * 合成音效生成器
   * ============================================================ */
  _tone(freq, dur, type, vol, sweepTo){
    if(!this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if(sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
  },

  _noise(dur, vol, filterFreq){
    if(!this.enabled) return;
    const t = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);
  },

  /* ============================================================
   * 预设音效（优先网络，fallback 合成）
   * ============================================================ */
  playPunch(){
    if(this.net.punch){ this.playNet('punch', 0.7); }
    else { this._noise(0.08, 0.25, 1200); this._tone(180, 0.10, 'sine', 0.15, 60); }
  },
  playHit(){
    if(this.net.hit){ this.playNet('hit', 0.75); }
    else { this._noise(0.12, 0.30, 1500); this._tone(120, 0.15, 'square', 0.10, 40); }
  },
  playKick(){
    if(this.net.kick){ this.playNet('kick', 0.7); }
    else { this._noise(0.10, 0.20, 900); this._tone(160, 0.12, 'sine', 0.12, 50); }
  },
  playKill(){
    this._tone(880, 0.10, 'sine', 0.20, 440);
    this._tone(1320, 0.20, 'sine', 0.15, 660);
  },
  playDeath(){
    if(this.net.death){ this.playNet('death', 0.8); }
    else { this._noise(0.25, 0.3, 600); this._tone(200, 0.4, 'sine', 0.15, 60); }
  },
  playHurt(){
    if(this.net.hurt){ this.playNet('hurt', 0.7); }
    else { this._noise(0.10, 0.20, 700); this._tone(220, 0.12, 'sawtooth', 0.10, 100); }
  },
  playJump(){
    this._tone(300, 0.15, 'sine', 0.12, 600);
  },
  playLand(){
    this._noise(0.08, 0.15, 500);
  },
  playClimb(){
    this._noise(0.15, 0.10, 400);
    this._tone(400, 0.20, 'sine', 0.08, 800);
  },
  playClash(){
    this._tone(1200, 0.15, 'square', 0.18, 300);
    this._noise(0.10, 0.20, 2000);
  },
  playWhoosh(){
    this._noise(0.15, 0.10, 2000);
  },
  playFootstep(){
    this._noise(0.05, 0.06, 400);
  },

  /* ============================================================
   * 耳鸣（玩家死亡）
   * ============================================================ */
  playTinnitus(){
    /* 优先网络 */
    if(this.net.tinnitus){ this.playNet('tinnitus', TBOX.DATA.TINNITUS.volume || 0.35); return; }
    if(!this.enabled) return;
    const t = this.ctx.currentTime;
    /* 高频持续音 */
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4400, t);
    osc.frequency.exponentialRampToValueAtTime(3200, t + 2.0);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 2.0);
    /* 低频闷响 */
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, t);
    gain2.gain.setValueAtTime(0.15, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.8);
  },

  /* ============================================================
   * 心跳（engine 调用）
   * ============================================================ */
  playHeartbeat(hp){
    if(this.net.heartbeat){
      const vol = hp < 20 ? 0.8 : (hp < 50 ? 0.6 : 0.4);
      this.playNet('heartbeat', vol);
      return;
    }
    if(!this.enabled) return;
    /* 合成心跳（双拍） */
    const vol = hp < 20 ? 0.5 : (hp < 50 ? 0.35 : 0.22);
    this._tone(60, 0.10, 'sine', vol, 40);
    setTimeout(() => {
      this._tone(55, 0.08, 'sine', vol * 0.7, 35);
    }, 120);
  },

  /* ============================================================
   * 呼吸（engine 调用）
   * ============================================================ */
  playBreath(hp){
    if(this.net.breath){
      const vol = hp < 20 ? 0.6 : (hp < 50 ? 0.4 : 0.25);
      this.playNet('breath', vol);
      return;
    }
    if(!this.enabled) return;
    const vol = hp < 20 ? 0.18 : (hp < 50 ? 0.12 : 0.08);
    this._noise(0.30, vol, 600);
  },

  /* ============================================================
   * 环境音（风 / 鸟，循环）
   * ============================================================ */
  startAmbient(){
    if(!this.enabled) return;
    if(this.ambientNodes.length > 0) return;

    /* 风（低频噪声，循环） */
    if(this.net.ambientWind){
      const wind = this.net.ambientWind.cloneNode();
      wind.loop = true;
      wind.volume = 0.18;
      wind.play().catch(() => {});
      this.ambientNodes.push(wind);
    } else {
      /* 合成风：用长噪声 + 滤波器 */
      const wind = this._makeWindLoop();
      if(wind) this.ambientNodes.push(wind);
    }

    /* 鸟（随机间隔） */
    if(this.net.ambientBird){
      const bird = this.net.ambientBird.cloneNode();
      bird.loop = true;
      bird.volume = 0.10;
      bird.play().catch(() => {});
      this.ambientNodes.push(bird);
    }
  },

  stopAmbient(){
    for(const node of this.ambientNodes){
      try {
        if(node.stop) node.stop();
        else if(node.pause) node.pause();
      } catch(e){}
    }
    this.ambientNodes = [];
  },

  /* 合成风循环 */
  _makeWindLoop(){
    if(!this.ctx) return null;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for(let i = 0; i < bufferSize; i++){
        /* 布朗噪声 */
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.25;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);
      src.start();

      /* 返回一个带 stop 的对象 */
      return {
        stop: function(){ try { src.stop(); } catch(e){} },
        source: src,
        gain: gain
      };
    } catch(e){ return null; }
  },

  /* ============================================================
   * UI 音效
   * ============================================================ */
  playUIClick(){
    if(this.net.uiClick){ this.playNet('uiClick', 0.5); return; }
    this._tone(800, 0.04, 'square', 0.08, 500);
  },
  playUIHover(){
    if(this.net.uiHover){ this.playNet('uiHover', 0.3); return; }
    this._tone(1200, 0.02, 'sine', 0.04);
  },

  /* ============================================================
   * 设置同步
   * ============================================================ */
  applySettings(){
    const m = TBOX.Save.getNum('tbox_volMaster', 70) / 100;
    const s = TBOX.Save.getNum('tbox_volSfx', 70) / 100;
    const ambientOn = TBOX.Save.get('tbox_ambientSound', '1') === '1';
    this.setMasterVolume(m);
    this.setSfxVolume(s);
    this.setAmbientVolume(ambientOn ? 0.35 : 0);
    const sfxOn = TBOX.Save.get('tbox_sfxOn', '1') === '1';
    this.enabled = sfxOn;
  }
};

/* 监听设置变化 */
if(window.TBOX && TBOX.Events){
  TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, function(data){
    if(!TBOX.Audio || !TBOX.Audio.initialized) return;
    if(data.key === 'tbox_volMaster' || data.key === 'tbox_volSfx' ||
       data.key === 'tbox_sfxOn' || data.key === 'tbox_ambientSound'){
      TBOX.Audio.applySettings();
    }
  });
}