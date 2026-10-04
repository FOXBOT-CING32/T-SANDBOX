/* ============================================================
 * audio.js · 音效系统
 * V1.0.1 · 第一批改造：全走可信合成音效 + 死亡音效修复
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Audio = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  ambientGain: null,
  enabled: false,
  initialized: false,
  ambientNodes: [],

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
    } catch(e){ console.warn('Audio init fail', e); }
  },

  resume(){
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMasterVolume(v){ if(this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v)); },
  setSfxVolume(v){ if(this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v)); },
  setAmbientVolume(v){ if(this.ambientGain) this.ambientGain.gain.value = Math.max(0, Math.min(1, v)); },

  /* ============================================================
   * 合成音效基础
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
   * 预设音效（全部合成，独特且可信）
   * ============================================================ */
  playPunch(){
    this._tone(150, 0.08, 'sine', 0.30, 60);
    this._noise(0.06, 0.25, 2000);
    this._tone(800, 0.04, 'square', 0.08, 400);
  },
  playHit(){
    this._tone(120, 0.15, 'square', 0.10, 40);
    this._noise(0.12, 0.30, 1500);
    this._tone(400, 0.06, 'sine', 0.15, 180);
  },
  playKick(){
    this._tone(160, 0.12, 'sine', 0.12, 50);
    this._noise(0.10, 0.20, 900);
  },
  playKill(){
    this._tone(880, 0.10, 'sine', 0.20, 440);
    this._tone(1320, 0.20, 'sine', 0.15, 660);
  },
  playDeath(){
    /* 死亡音效：低频下坠 + 噪声 + 尾音 */
    if(!this.enabled) return;
    this._tone(180, 0.6, 'sawtooth', 0.25, 40);
    this._noise(0.5, 0.30, 400);
    const self = this;
    setTimeout(function(){
      self._tone(90, 0.8, 'sine', 0.20, 30);
    }, 100);
  },
  playHurt(){
    this._noise(0.10, 0.20, 700);
    this._tone(220, 0.12, 'sawtooth', 0.10, 100);
  },
  playJump(){ this._tone(300, 0.15, 'sine', 0.12, 600); },
  playLand(){ this._noise(0.08, 0.15, 500); },
  playClimb(){ this._noise(0.15, 0.10, 400); this._tone(400, 0.20, 'sine', 0.08, 800); },
  playClash(){ this._tone(1200, 0.15, 'square', 0.18, 300); this._noise(0.10, 0.20, 2000); },
  playWhoosh(){ this._noise(0.15, 0.10, 2000); },
  playFootstep(){ this._noise(0.05, 0.06, 400); },

  playTinnitus(){
    if(!this.enabled) return;
    const t = this.ctx.currentTime;
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

  playHeartbeat(hp){
    if(!this.enabled) return;
    const vol = hp < 20 ? 0.5 : (hp < 50 ? 0.35 : 0.22);
    this._tone(60, 0.10, 'sine', vol, 40);
    const self = this;
    setTimeout(function(){ self._tone(55, 0.08, 'sine', vol * 0.7, 35); }, 120);
  },

  playBreath(hp){
    if(!this.enabled) return;
    const vol = hp < 20 ? 0.18 : (hp < 50 ? 0.12 : 0.08);
    this._noise(0.30, vol, 600);
  },

  startAmbient(){
    if(!this.enabled) return;
    if(this.ambientNodes.length > 0) return;
    const wind = this._makeWindLoop();
    if(wind) this.ambientNodes.push(wind);
  },

  stopAmbient(){
    for(const node of this.ambientNodes){
      try { if(node.stop) node.stop(); } catch(e){}
    }
    this.ambientNodes = [];
  },

  _makeWindLoop(){
    if(!this.ctx) return null;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for(let i = 0; i < bufferSize; i++){
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
      return { stop: function(){ try { src.stop(); } catch(e){} }, source: src, gain: gain };
    } catch(e){ return null; }
  },

  playUIClick(){ this._tone(800, 0.04, 'square', 0.08, 500); },
  playUIHover(){ this._tone(1200, 0.02, 'sine', 0.04); },

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

if(window.TBOX && TBOX.Events){
  TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, function(data){
    if(!TBOX.Audio || !TBOX.Audio.initialized) return;
    if(data.key === 'tbox_volMaster' || data.key === 'tbox_volSfx' ||
       data.key === 'tbox_sfxOn' || data.key === 'tbox_ambientSound'){
      TBOX.Audio.applySettings();
    }
  });
}