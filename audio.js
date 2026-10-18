/* ============================================================
 * audio.js · 音效系统
 * V2.0.0 · ADSR 包络 + 多层合成 + 滤波扫频 + 混响
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Audio = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  ambientGain: null,
  reverbNode: null,
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

      /* 混响 */
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this._makeReverbIR(1.5, 2.0);
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.25;
      this.reverbNode.connect(reverbGain);
      reverbGain.connect(this.masterGain);

      const m = TBOX.Save.getNum('tbox_volMaster', 70) / 100;
      const s = TBOX.Save.getNum('tbox_volSfx', 70) / 100;
      this.masterGain.gain.value = m;
      this.sfxGain.gain.value = s;
      this.ambientGain.gain.value = 0.35;
      this.enabled = true;
      this.initialized = true;
    } catch(e){ console.warn('Audio init fail', e); }
  },

  _makeReverbIR(duration, decay){
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(2, len, sr);
    for(let c = 0; c < 2; c++){
      const data = buf.getChannelData(c);
      for(let i = 0; i < len; i++){
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  },

  resume(){
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMasterVolume(v){ if(this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v)); },
  setSfxVolume(v){ if(this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v)); },
  setAmbientVolume(v){ if(this.ambientGain) this.ambientGain.gain.value = Math.max(0, Math.min(1, v)); },

  /* ============================================================
   * ★ 合成引擎：ADSR 包络 + 滤波 + 混响
   * ============================================================ */
  _synthVoice(opts){
    if(!this.enabled) return;
    opts = opts || {};
    const t = this.ctx.currentTime;
    const freq = opts.freq || 440;
    const freqEnd = opts.freqEnd || freq;
    const type = opts.type || 'sine';
    const dur = opts.dur || 0.2;
    const vol = opts.vol || 0.2;
    const attack = opts.attack || 0.005;
    const decay = opts.decay || 0.05;
    const sustain = opts.sustain !== undefined ? opts.sustain : 0.7;
    const release = opts.release || 0.1;
    const filterFreq = opts.filterFreq || 0;
    const filterEnd = opts.filterEnd || filterFreq;
    const filterType = opts.filterType || 'lowpass';
    const reverbSend = opts.reverb !== undefined ? opts.reverb : 0.15;
    const detune = opts.detune || 0;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if(freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    if(detune) osc.detune.value = detune;

    /* ADSR */
    const peak = vol;
    const sus = vol * sustain;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + attack + decay);
    gain.gain.setValueAtTime(Math.max(0.0001, sus), t + dur - release);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    filter.type = filterType;
    if(filterFreq){
      filter.frequency.setValueAtTime(filterFreq, t);
      if(filterEnd !== filterFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t + dur);
      filter.Q.value = opts.q || 1;
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    if(reverbSend > 0 && this.reverbNode){
      const send = this.ctx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(this.reverbNode);
    }

    osc.start(t);
    osc.stop(t + dur + 0.01);
  },

  _noiseVoice(opts){
    if(!this.enabled) return;
    opts = opts || {};
    const t = this.ctx.currentTime;
    const dur = opts.dur || 0.15;
    const vol = opts.vol || 0.15;
    const filterFreq = opts.filterFreq || 800;
    const filterEnd = opts.filterEnd || filterFreq;
    const filterType = opts.filterType || 'lowpass';
    const q = opts.q || 1;
    const reverbSend = opts.reverb !== undefined ? opts.reverb : 0.1;

    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if(filterEnd !== filterFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t + dur);
    filter.Q.value = q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    if(reverbSend > 0 && this.reverbNode){
      const send = this.ctx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(this.reverbNode);
    }

    src.start(t);
    src.stop(t + dur);
  },

  /* ============================================================
   * 预设音效
   * ============================================================ */
  playPunch(){
    this._synthVoice({ freq: 150, freqEnd: 60, type: 'sine', dur: 0.10, vol: 0.35, attack: 0.002, decay: 0.04 });
    this._synthVoice({ freq: 800, freqEnd: 400, type: 'square', dur: 0.04, vol: 0.08 });
    this._noiseVoice({ dur: 0.06, vol: 0.25, filterFreq: 3000, filterEnd: 800 });
  },
  playHit(){
    this._synthVoice({ freq: 120, freqEnd: 40, type: 'square', dur: 0.18, vol: 0.15, attack: 0.001, decay: 0.05 });
    this._synthVoice({ freq: 400, freqEnd: 180, type: 'sine', dur: 0.07, vol: 0.18 });
    this._noiseVoice({ dur: 0.14, vol: 0.30, filterFreq: 2200, filterEnd: 400, q: 2 });
  },
  playKick(){
    this._synthVoice({ freq: 160, freqEnd: 50, type: 'sine', dur: 0.14, vol: 0.20 });
    this._noiseVoice({ dur: 0.12, vol: 0.22, filterFreq: 1200, filterEnd: 300 });
  },
  playKill(){
    this._synthVoice({ freq: 880, type: 'sine', dur: 0.10, vol: 0.22 });
    this._synthVoice({ freq: 1320, type: 'sine', dur: 0.22, vol: 0.15, attack: 0.01, decay: 0.05 });
    this._synthVoice({ freq: 1760, type: 'sine', dur: 0.30, vol: 0.08, attack: 0.02, decay: 0.08 });
  },
  playDeath(){
    this._synthVoice({ freq: 180, freqEnd: 40, type: 'sawtooth', dur: 0.6, vol: 0.28, attack: 0.01, decay: 0.1, release: 0.3, filterFreq: 1200, filterEnd: 200 });
    this._noiseVoice({ dur: 0.5, vol: 0.30, filterFreq: 400 });
    setTimeout(() => {
      this._synthVoice({ freq: 90, freqEnd: 30, type: 'sine', dur: 0.8, vol: 0.22, attack: 0.05, decay: 0.2, release: 0.4 });
    }, 100);
  },
  playHurt(){
    this._noiseVoice({ dur: 0.10, vol: 0.22, filterFreq: 800 });
    this._synthVoice({ freq: 220, freqEnd: 100, type: 'sawtooth', dur: 0.14, vol: 0.12 });
  },
  playJump(){
    this._synthVoice({ freq: 300, freqEnd: 600, type: 'sine', dur: 0.15, vol: 0.14, attack: 0.005, decay: 0.05 });
  },
  playLand(){
    this._noiseVoice({ dur: 0.08, vol: 0.18, filterFreq: 500 });
    this._synthVoice({ freq: 80, freqEnd: 40, type: 'sine', dur: 0.08, vol: 0.15 });
  },
  playClimb(){
    this._noiseVoice({ dur: 0.15, vol: 0.12, filterFreq: 400 });
    this._synthVoice({ freq: 400, freqEnd: 800, type: 'sine', dur: 0.20, vol: 0.10 });
  },
  playClash(){
    this._synthVoice({ freq: 1200, freqEnd: 300, type: 'square', dur: 0.15, vol: 0.20, filterFreq: 4000, filterEnd: 800 });
    this._noiseVoice({ dur: 0.10, vol: 0.22, filterFreq: 3000 });
  },
  playWhoosh(){
    this._noiseVoice({ dur: 0.15, vol: 0.10, filterFreq: 2000 });
  },
  playFootstep(){
    this._noiseVoice({ dur: 0.05, vol: 0.06, filterFreq: 400 });
  },

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
    this._synthVoice({ freq: 60, freqEnd: 40, type: 'sine', dur: 0.10, vol });
    setTimeout(() => {
      this._synthVoice({ freq: 55, freqEnd: 35, type: 'sine', dur: 0.08, vol: vol * 0.7 });
    }, 120);
  },

  playBreath(hp){
    if(!this.enabled) return;
    const vol = hp < 20 ? 0.18 : (hp < 50 ? 0.12 : 0.08);
    this._noiseVoice({ dur: 0.30, vol, filterFreq: 600, filterEnd: 300 });
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

  playUIClick(){ this._synthVoice({ freq: 800, freqEnd: 500, type: 'square', dur: 0.04, vol: 0.08 }); },
  playUIHover(){ this._synthVoice({ freq: 1200, type: 'sine', dur: 0.02, vol: 0.04 }); },

  /* ★ 抓取音 */
  playGrab(){
    this._synthVoice({ freq: 300, freqEnd: 600, type: 'sine', dur: 0.10, vol: 0.12 });
    this._noiseVoice({ dur: 0.08, vol: 0.08, filterFreq: 1500 });
  },
  /* ★ 放置音 */
  playDrop(){
    this._synthVoice({ freq: 600, freqEnd: 300, type: 'sine', dur: 0.08, vol: 0.10 });
    this._noiseVoice({ dur: 0.06, vol: 0.10, filterFreq: 600 });
  },
  /* ★ 抛掷音 */
  playThrow(){
    this._noiseVoice({ dur: 0.15, vol: 0.12, filterFreq: 2500, filterEnd: 800 });
    this._synthVoice({ freq: 400, freqEnd: 200, type: 'sine', dur: 0.12, vol: 0.10 });
  },

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