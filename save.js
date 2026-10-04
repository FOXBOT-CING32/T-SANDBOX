/* ============================================================
 * save.js · 存档系统
 * V1.0.0 · 第四阶段：角色配置 2.0（IndexedDB + localStorage 双通道）
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Save = {
  PREFIX: 'tbox_',

  /* ============================================================
   * 基础读写
   * ============================================================ */
  get(key, def){
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v;
    } catch(e){ return def; }
  },

  getNum(key, def){
    const v = Number(this.get(key, def));
    return isNaN(v) ? def : v;
  },

  getBool(key, def){
    const v = this.get(key, def ? '1' : '0');
    return v === '1' || v === true;
  },

  set(key, val){
    try {
      localStorage.setItem(key, String(val));
      TBOX.Events.emit(TBOX.EVENTS.SETTING_CHANGED, { key, value: String(val) });
    } catch(e){}
  },

  remove(key){
    try { localStorage.removeItem(key); } catch(e){}
  },

  /* ============================================================
   * 重置所有 tbox_ 设置（保留角色贴图？）
   * ============================================================ */
  reset(keepChar){
    const keys = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(this.PREFIX)){
        if(keepChar && (k === 'tbox_charConfig' || k.startsWith('tbox_tex_'))) continue;
        keys.push(k);
      }
    }
    keys.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
    TBOX.Events.emit(TBOX.EVENTS.SETTINGS_RESET);
  },

  /* ============================================================
   * 应用默认设置
   * ============================================================ */
  applyDefaults(){
    const def = TBOX.DATA.DEFAULT_SETTINGS;
    for(const k in def){
      if(localStorage.getItem(k) === null){
        try { localStorage.setItem(k, String(def[k])); } catch(e){}
      }
    }
  },

  loadAll(){
    const def = TBOX.DATA.DEFAULT_SETTINGS;
    const out = {};
    for(const k in def){
      out[k] = this.get(k, def[k]);
    }
    return out;
  },

  /* ============================================================
   * ★ 角色配置读写 2.0
   * 小字段（颜色/尺寸/挂件）→ localStorage
   * 大字段（贴图 DataURL）→ IndexedDB
   * ============================================================ */

  /* 贴图字段 ID 集合 */
  TEX_FIELDS: [
    'face',
    'texTorso',
    'texArmL_upper', 'texArmL_lower',
    'texArmR_upper', 'texArmR_lower',
    'texHandL', 'texHandR',
    'texLegL_upper', 'texLegL_lower',
    'texLegR_upper', 'texLegR_lower',
    'texFootL', 'texFootR',
    'tattooArmL', 'tattooArmR', 'tattooChest', 'tattooBack'
  ],

  /* 读取完整角色配置（同步，只读 localStorage 字段） */
  getChar(){
    const def = TBOX.DATA.CHAR || {};
    const out = Object.assign({}, def);
    try {
      const raw = localStorage.getItem('tbox_charConfig');
      if(raw){
        const cfg = JSON.parse(raw);
        for(const k in cfg){
          /* 只合并非贴图字段（贴图走 IndexedDB） */
          if(this.TEX_FIELDS.indexOf(k) >= 0) continue;
          if(cfg[k] !== undefined) out[k] = cfg[k];
        }
      }
    } catch(e){}
    return out;
  },

  /* 读取完整角色配置（异步，含 IndexedDB 贴图） */
  getCharAsync(){
    const self = this;
    const base = this.getChar();
    return new Promise(function(resolve){
      const promises = self.TEX_FIELDS.map(function(field){
        return TBOX.Utils.idbGet('char_' + field).then(function(val){
          return { field: field, value: val || '' };
        }).catch(function(){
          return { field: field, value: '' };
        });
      });
      Promise.all(promises).then(function(results){
        results.forEach(function(r){
          base[r.field] = r.value;
        });
        resolve(base);
      });
    });
  },

  /* 保存角色配置（异步，写入 localStorage + IndexedDB） */
  setChar(cfg){
    const self = this;
    if(!cfg) cfg = {};
    const def = TBOX.DATA.CHAR || {};
    const merged = Object.assign({}, def, cfg);

    /* 1. 拆分字段：贴图 → IndexedDB，其他 → localStorage */
    const localCfg = {};
    const texJobs = [];

    for(const k in merged){
      if(self.TEX_FIELDS.indexOf(k) >= 0){
        /* 贴图字段 */
        const val = merged[k];
        if(val){
          texJobs.push(TBOX.Utils.idbSet('char_' + k, val));
        } else {
          texJobs.push(TBOX.Utils.idbDel('char_' + k));
        }
      } else {
        localCfg[k] = merged[k];
      }
    }

    /* 2. 存 localStorage */
    try {
      localStorage.setItem('tbox_charConfig', JSON.stringify(localCfg));
    } catch(e){}

    /* 3. 存 IndexedDB */
    return Promise.all(texJobs).then(function(){
      TBOX.Events.emit(TBOX.EVENTS.CHAR_CHANGED, merged);
      return true;
    }).catch(function(){
      return false;
    });
  },

  /* 删除角色配置（含贴图） */
  removeChar(){
    const self = this;
    try { localStorage.removeItem('tbox_charConfig'); } catch(e){}
    const jobs = this.TEX_FIELDS.map(function(field){
      return TBOX.Utils.idbDel('char_' + field);
    });
    return Promise.all(jobs).then(function(){
      TBOX.Events.emit(TBOX.EVENTS.CHAR_CHANGED, Object.assign({}, TBOX.DATA.CHAR || {}));
      return true;
    });
  },

  /* ============================================================
   * ★ UI 布局读写
   * ============================================================ */
  getLayout(){
    try {
      const raw = localStorage.getItem('tbox_uiLayout');
      if(!raw) return null;
      return JSON.parse(raw);
    } catch(e){ return null; }
  },

  setLayout(layout){
    try {
      localStorage.setItem('tbox_uiLayout', JSON.stringify(layout));
      TBOX.Events.emit(TBOX.EVENTS.LAYOUT_CHANGED, layout);
      return true;
    } catch(e){ return false; }
  },

  removeLayout(){
    try { localStorage.removeItem('tbox_uiLayout'); } catch(e){}
    TBOX.Events.emit(TBOX.EVENTS.LAYOUT_CHANGED, null);
  },

  /* ============================================================
   * ★ 击杀统计
   * ============================================================ */
  getKills(){ return this.getNum('tbox_kills', 0); },
  addKill(){
    const n = this.getKills() + 1;
    try { localStorage.setItem('tbox_kills', String(n)); } catch(e){}
    TBOX.Events.emit(TBOX.EVENTS.KILL_ADDED, n);
    return n;
  },
  getDeaths(){ return this.getNum('tbox_deaths', 0); },
  addDeath(){
    const n = this.getDeaths() + 1;
    try { localStorage.setItem('tbox_deaths', String(n)); } catch(e){}
    TBOX.Events.emit(TBOX.EVENTS.DEATH_ADDED, n);
    return n;
  },

  /* ============================================================
   * 通用 JSON
   * ============================================================ */
  getJSON(key, def){
    try {
      const raw = localStorage.getItem(key);
      if(raw === null) return def;
      return JSON.parse(raw);
    } catch(e){ return def; }
  },

  setJSON(key, val){
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch(e){ return false; }
  }
};

/* 首次启动应用默认设置 */
TBOX.Save.applyDefaults();