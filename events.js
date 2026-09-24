/* ============================================================
 * events.js · 事件系统
 * 发布订阅，系统间通信
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.Events = {
  _listeners: {},

  /* 订阅 */
  on(name, fn){
    if(!this._listeners[name]) this._listeners[name] = [];
    this._listeners[name].push(fn);
    return () => this.off(name, fn);
  },

  /* 取消订阅 */
  off(name, fn){
    const arr = this._listeners[name];
    if(!arr) return;
    const i = arr.indexOf(fn);
    if(i >= 0) arr.splice(i, 1);
  },

  /* 发布 */
  emit(name, data){
    const arr = this._listeners[name];
    if(!arr) return;
    for(let i = 0; i < arr.length; i++){
      try { arr[i](data); } catch(e){ console.warn('Event err:', name, e); }
    }
  },

  /* 只触发一次 */
  once(name, fn){
    const wrap = (data) => { fn(data); this.off(name, wrap); };
    this.on(name, wrap);
  },

  /* 清空 */
  clear(name){
    if(name) delete this._listeners[name];
    else this._listeners = {};
  }
};

/* 全局事件名常量 */
TBOX.EVENTS = {
  /* 设置 */
  SETTING_CHANGED: 'setting:changed',
  SETTINGS_RESET: 'setting:reset',
  /* 游戏 */
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_QUIT: 'game:quit',
  /* 玩家 */
  PLAYER_ATTACK: 'player:attack',
  PLAYER_HIT: 'player:hit',
  PLAYER_KILL: 'player:kill',
  PLAYER_DEAD: 'player:dead',
  /* 相机 */
  CAM_SWITCH: 'cam:switch',
  /* 动作 */
  ACTION_START: 'action:start',
  ACTION_END: 'action:end',
  /* 音频 */
  AUDIO_PLAY: 'audio:play',
  /* 跨页面 */
  STORAGE_CHANGED: 'storage:changed'
};

/* 跨页面设置同步（storage 事件） */
window.addEventListener('storage', (e) => {
  if(e.key && e.key.startsWith('tbox_')){
    TBOX.Events.emit(TBOX.EVENTS.STORAGE_CHANGED, { key: e.key, value: e.newValue });
    TBOX.Events.emit(TBOX.EVENTS.SETTING_CHANGED, { key: e.key, value: e.newValue });
  }
});