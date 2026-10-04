/* ============================================================
 * utils.js · 工具系统
 * V1.0.0 · 第四阶段：图片压缩 + IndexedDB + 全身缩放
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Utils = {
  /* ---------- 数学 ---------- */
  lerp(a, b, t){ return a + (b - a) * t; },
  clamp(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerpAngle(a, b, t){
    let d = b - a;
    while(d > Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  },
  dist2D(x1, z1, x2, z2){ return Math.hypot(x2 - x1, z2 - z1); },
  dist3D(a, b){ return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); },

  /* ---------- 缓动 ---------- */
  easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); },
  easeInCubic(t){ return t * t * t; },
  easeOutQuint(t){ return 1 - Math.pow(1 - t, 5); },
  easeInQuart(t){ return t * t * t * t; },
  easeInOutCubic(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  easeInOutQuad(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
  easeOutBack(t){ const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },

  /* ---------- 随机 ---------- */
  rand(a, b){ return a + Math.random() * (b - a); },
  randInt(a, b){ return Math.floor(a + Math.random() * (b - a + 1)); },
  randSign(){ return Math.random() < 0.5 ? -1 : 1; },
  pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; },

  /* ---------- 格式化 ---------- */
  pad(n, len){ return String(n).padStart(len, '0'); },
  deg(v){ return (v * 180 / Math.PI) % 360; },
  rad(v){ return v * Math.PI / 180; },
  fixNum(v, d){ return Number(v.toFixed(d === undefined ? 1 : d)); },

  /* ---------- DOM ---------- */
  $(sel){ return document.querySelector(sel); },
  $$(sel){ return Array.from(document.querySelectorAll(sel)); },
  on(el, ev, fn, opt){ if(el) el.addEventListener(ev, fn, opt); },
  off(el, ev, fn){ if(el) el.removeEventListener(ev, fn); },
  show(el){ if(el) el.style.display = 'block'; },
  hide(el){ if(el) el.style.display = 'none'; },
  toggleClass(el, cls, on){ if(el) el.classList.toggle(cls, on); },

  /* ---------- 时间 ---------- */
  now(){ return performance.now(); },
  dt(last){ return Math.min((performance.now() - last) / 1000, 0.05); },

  /* ---------- 数组 ---------- */
  sum(arr){ return arr.reduce((a, b) => a + b, 0); },
  avg(arr){ return arr.length ? this.sum(arr) / arr.length : 0; },

  /* ---------- 对象 ---------- */
  clone(o){ return JSON.parse(JSON.stringify(o)); },
  merge(a, b){ return Object.assign({}, a, b); },

  /* ============================================================
   * ★ 图片工具
   * ============================================================ */
  fileToDataURL(file){
    return new Promise(function(resolve, reject){
      if(!file) return reject(new Error('文件为空'));
      var reader = new FileReader();
      reader.onload = function(e){ resolve(e.target.result); };
      reader.onerror = function(){ reject(new Error('文件读取失败')); };
      reader.readAsDataURL(file);
    });
  },

  /* ★ 图片压缩（返回 DataURL） */
  imageToDataURL(file, maxSize){
    var self = this;
    maxSize = maxSize || 512;
    return new Promise(function(resolve, reject){
      if(!file) return reject(new Error('文件为空'));
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var w = img.width, h = img.height;
          if(w <= maxSize && h <= maxSize){
            return resolve(e.target.result);
          }
          var scale = Math.min(maxSize / w, maxSize / h);
          var nw = Math.round(w * scale);
          var nh = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = nw;
          canvas.height = nh;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, nw, nh);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch(err){
            resolve(e.target.result);
          }
        };
        img.onerror = function(){ reject(new Error('图片解析失败')); };
        img.src = e.target.result;
      };
      reader.onerror = function(){ reject(new Error('文件读取失败')); };
      reader.readAsDataURL(file);
    });
  },

  /* DataURL → Blob */
  dataURLToBlob(dataURL){
    try {
      var parts = dataURL.split(',');
      var mime = parts[0].match(/:(.*?);/)[1];
      var bstr = atob(parts[1]);
      var n = bstr.length;
      var u8 = new Uint8Array(n);
      for(var i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
      return new Blob([u8], { type: mime });
    } catch(e){ return null; }
  },

  /* Blob → DataURL */
  blobToDataURL(blob){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){ resolve(e.target.result); };
      reader.onerror = function(){ reject(new Error('Blob 读取失败')); };
      reader.readAsDataURL(blob);
    });
  },

  /* 加载图片（用于贴图） */
  loadImage(url){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){ resolve(img); };
      img.onerror = function(){ reject(new Error('图片加载失败: ' + url)); };
      img.src = url;
    });
  },

  /* 检查 URL 是否有效图片 */
  isValidImageUrl(url){
    if(!url || typeof url !== 'string') return false;
    return /^(https?:|data:image\/)/i.test(url.trim());
  },

  /* ============================================================
   * ★ IndexedDB 工具（用于存角色贴图）
   * ============================================================ */
  _idb: null,
  _idbReady: null,

  idbOpen(){
    var self = this;
    if(this._idbReady) return this._idbReady;
    this._idbReady = new Promise(function(resolve, reject){
      try {
        var req = indexedDB.open('tbox_db', 1);
        req.onupgradeneeded = function(e){
          var db = e.target.result;
          if(!db.objectStoreNames.contains('charTextures')){
            db.createObjectStore('charTextures', { keyPath: 'id' });
          }
        };
        req.onsuccess = function(e){
          self._idb = e.target.result;
          resolve(self._idb);
        };
        req.onerror = function(){
          reject(new Error('IndexedDB 打开失败'));
        };
      } catch(err){
        reject(err);
      }
    });
    return this._idbReady;
  },

  idbSet(key, value){
    var self = this;
    return this.idbOpen().then(function(db){
      return new Promise(function(resolve, reject){
        try {
          var tx = db.transaction('charTextures', 'readwrite');
          var store = tx.objectStore('charTextures');
          store.put({ id: key, value: value });
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ reject(tx.error); };
        } catch(e){ reject(e); }
      });
    }).catch(function(){
      /* 回退到 localStorage */
      try {
        localStorage.setItem('tbox_tex_' + key, value);
        return true;
      } catch(e){ return false; }
    });
  },

  idbGet(key){
    var self = this;
    return this.idbOpen().then(function(db){
      return new Promise(function(resolve){
        try {
          var tx = db.transaction('charTextures', 'readonly');
          var store = tx.objectStore('charTextures');
          var req = store.get(key);
          req.onsuccess = function(){
            if(req.result && req.result.value !== undefined) resolve(req.result.value);
            else {
              try { resolve(localStorage.getItem('tbox_tex_' + key)); }
              catch(e){ resolve(null); }
            }
          };
          req.onerror = function(){
            try { resolve(localStorage.getItem('tbox_tex_' + key)); }
            catch(e){ resolve(null); }
          };
        } catch(e){
          try { resolve(localStorage.getItem('tbox_tex_' + key)); }
          catch(err){ resolve(null); }
        }
      });
    }).catch(function(){
      try { return Promise.resolve(localStorage.getItem('tbox_tex_' + key)); }
      catch(e){ return Promise.resolve(null); }
    });
  },

  idbDel(key){
    var self = this;
    return this.idbOpen().then(function(db){
      return new Promise(function(resolve){
        try {
          var tx = db.transaction('charTextures', 'readwrite');
          var store = tx.objectStore('charTextures');
          store.delete(key);
          tx.oncomplete = function(){ resolve(true); };
          tx.onerror = function(){ resolve(false); };
        } catch(e){
          try { localStorage.removeItem('tbox_tex_' + key); } catch(err){}
          resolve(false);
        }
      });
    }).catch(function(){
      try { localStorage.removeItem('tbox_tex_' + key); } catch(e){}
      return Promise.resolve(false);
    });
  },

  /* ============================================================
   * ★ 颜色工具
   * ============================================================ */
  hexToRgb(hex){
    if(!hex) return { r: 0, g: 0, b: 0 };
    hex = hex.replace('#', '');
    if(hex.length === 3){
      hex = hex.split('').map(function(c){ return c + c; }).join('');
    }
    var num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  },

  rgbToHex(r, g, b){
    var toHex = function(v){ var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length === 1 ? '0' + s : s; };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },

  toThreeColor(hex){
    var rgb = this.hexToRgb(hex);
    return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
  },

  adjustBrightness(hex, amount){
    var rgb = this.hexToRgb(hex);
    return this.rgbToHex(rgb.r + amount, rgb.g + amount, rgb.b + amount);
  },

  /* ============================================================
   * ★ 归一化坐标工具
   * ============================================================ */
  normToPx(n, total){ return n * total; },
  pxToNorm(px, total){ return total > 0 ? px / total : 0; },

  applyLayout(el, data, containerW, containerH){
    if(!el || !data) return;
    if(data.x !== undefined) el.style.left = (data.x * containerW) + 'px';
    if(data.y !== undefined) el.style.top = (data.y * containerH) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  },

  /* ============================================================
   * ★ 设备识别
   * ============================================================ */
  isTouch(){
    return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  },
  isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },
  isAndroid(){
    return /Android/i.test(navigator.userAgent);
  },
  isPC(){
    return !this.isTouch();
  },

  /* ============================================================
   * ★ 性能检测
   * ============================================================ */
  detectPerf(){
    var cores = navigator.hardwareConcurrency || 4;
    var dpr = window.devicePixelRatio || 1;
    var mem = navigator.deviceMemory || 4;
    var mobile = this.isTouch();
    var score = 0;
    score += Math.min(cores, 8);
    score += Math.min(mem, 8);
    if(!mobile) score += 4;
    if(dpr > 2) score -= 2;
    if(score >= 14) return 'high';
    if(score >= 8) return 'mid';
    return 'low';
  },

  /* ★ 详细性能信息（用于红字警告） */
  detectPerfDetail(){
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 4;
    var dpr = window.devicePixelRatio || 1;
    var mobile = this.isTouch();
    var perf = this.detectPerf();
    var gpu = 'unknown';
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if(gl){
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if(dbg){
          gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch(e){}
    return {
      cores: cores,
      memory: mem,
      dpr: dpr,
      mobile: mobile,
      perf: perf,
      gpu: gpu
    };
  },

  /* ============================================================
   * ★ 全身尺寸缩放
   * cc = 角色配置
   * ============================================================ */
  applyBodyScale(ch, cc){
    if(!ch || !cc) return;
    var h = cc.sizeHeight      !== undefined ? cc.sizeHeight      : 1.0;
    var hr = cc.sizeHeadRatio  !== undefined ? cc.sizeHeadRatio   : 1.0;
    var sh = cc.sizeShoulder   !== undefined ? cc.sizeShoulder    : 1.0;
    var al = cc.sizeArmLength  !== undefined ? cc.sizeArmLength   : 1.0;
    var hs = cc.sizeHandSize   !== undefined ? cc.sizeHandSize    : 1.0;
    var ll = cc.sizeLegLength  !== undefined ? cc.sizeLegLength   : 1.0;
    var fs = cc.sizeFootSize   !== undefined ? cc.sizeFootSize    : 1.0;
    var bt = cc.sizeBodyThick  !== undefined ? cc.sizeBodyThick   : 1.0;

    /* 整体身高：整个 root Y 轴缩放 */
    if(ch.root) ch.root.scale.set(1, h, 1);

    /* 头部比例 */
    if(ch.head){
      var headS = hr;
      ch.head.scale.set(headS, headS, headS);
    }

    /* 肩宽：左右臂 X 位置 */
    if(ch.armL && ch.armR){
      var armBaseX = TBOX.DATA.ARM_SHOULDER_X * sh;
      ch.armL.position.x = -armBaseX;
      ch.armR.position.x = armBaseX;
    }

    /* 躯干体厚 */
    if(ch.torso){
      ch.torso.scale.z = bt;
    }

    /* 手臂长度（缩放大臂 + 小臂 Y） */
    if(ch.armL && ch.armR){
      /* 通过调整 forearm 位置和 scale 模拟 */
      if(ch.foreL){ ch.foreL.position.y = -0.22 * al; }
      if(ch.foreR){ ch.foreR.position.y = -0.22 * al; }
    }

    /* 手部大小 */
    if(ch.fistL){ ch.fistL.scale.set(hs, hs, hs); }
    if(ch.fistR){ ch.fistR.scale.set(hs, hs, hs); }

    /* 腿长（根位置下移 + 腿 scale） */
    if(ch.legL && ch.legR){
      var legBaseY = 0.82 * ll;
      ch.legL.position.y = legBaseY;
      ch.legR.position.y = legBaseY;
    }

    /* 脚部大小 */
    if(ch.footL){ ch.footL.scale.set(fs, fs, fs); }
    if(ch.footR){ ch.footR.scale.set(fs, fs, fs); }
  },

  /* ============================================================
   * ★ 字符串
   * ============================================================ */
  escapeHtml(s){
    if(!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  truncate(s, max){
    if(!s) return '';
    if(s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  },

  shortId(){
    return Math.random().toString(36).slice(2, 8);
  },

  /* ============================================================
   * ★ 相机工具
   * ============================================================ */
  sphereCam(targetX, targetY, targetZ, yaw, pitch, dist){
    var cx = Math.sin(yaw) * Math.cos(pitch) * dist;
    var cy = Math.sin(pitch) * dist;
    var cz = Math.cos(yaw) * Math.cos(pitch) * dist;
    return {
      x: targetX + cx,
      y: targetY + cy,
      z: targetZ + cz
    };
  },

  /* ============================================================
   * ★ 等待
   * ============================================================ */
  wait(ms){
    return new Promise(function(resolve){ setTimeout(resolve, ms); });
  },

  /* ============================================================
   * ★ 数字格式化
   * ============================================================ */
  formatNumber(n){
    if(!isFinite(n)) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  formatPercent(v, total){
    if(!total) return '0%';
    return Math.round(v / total * 100) + '%';
  },

  /* ============================================================
   * ★ 音频工具
   * ============================================================ */
  loadAudio(url){
    return new Promise(function(resolve, reject){
      var audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.oncanplaythrough = function(){ resolve(audio); };
      audio.onerror = function(){ reject(new Error('音频加载失败: ' + url)); };
      audio.load();
    });
  },

  playAudio(audio, volume){
    if(!audio) return;
    try {
      var clone = audio.cloneNode();
      clone.volume = volume !== undefined ? volume : 0.5;
      clone.play().catch(function(){});
    } catch(e){}
  },

  /* ============================================================
   * ★ 存储工具
   * ============================================================ */
  getJSON(key, def){
    try {
      var raw = localStorage.getItem(key);
      if(raw === null) return def;
      return JSON.parse(raw);
    } catch(e){ return def; }
  },
  setJSON(key, val){
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch(e){ return false; }
  },

  /* ============================================================
   * ★ 数学补充
   * ============================================================ */
  smoothstep(edge0, edge1, x){
    var t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },

  damp(current, target, lambda, dt){
    return this.lerp(current, target, 1 - Math.exp(-lambda * dt));
  },

  angleDiff(a, b){
    var d = b - a;
    while(d > Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  inSector(cx, cz, tx, tz, facing, angleRad){
    var dx = tx - cx, dz = tz - cz;
    var dist = Math.hypot(dx, dz);
    if(dist < 0.0001) return true;
    var nx = dx / dist, nz = dz / dist;
    var fx = Math.sin(facing), fz = Math.cos(facing);
    var dot = nx * fx + nz * fz;
    return Math.acos(this.clamp(dot, -1, 1)) <= angleRad;
  }
};