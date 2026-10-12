/* ============================================================
 * layout.js · 布局编辑器（废弃 · 仅保留入口）
 * V1.0.0 · 已改为游戏内就地编辑
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.LayoutEditor = {
  /* 默认布局从 data.js 读，不再单独维护 */
  DEFAULTS: null,

  init(){
    /* 这个页面只做入口，不再独立编辑 */
    var target = 'game.html?edit=1';
    try { window.location.replace(target); }
    catch(e){ window.location.href = target; }
  },

  /* 兼容旧调用：返回默认布局 */
  getDefaults(){
    if(this.DEFAULTS) return this.DEFAULTS;
    var d = (window.TBOX && TBOX.DATA && TBOX.DATA.DEFAULT_LAYOUT) ? TBOX.DATA.DEFAULT_LAYOUT : {};
    this.DEFAULTS = d;
    return d;
  }
};

/* 兼容旧代码：如果还有地方读 TBOX.LayoutEditor.DEFAULTS */
if(window.TBOX && TBOX.DATA && TBOX.DATA.DEFAULT_LAYOUT){
  TBOX.LayoutEditor.DEFAULTS = TBOX.DATA.DEFAULT_LAYOUT;
}

if(document.readyState === 'complete' || document.readyState === 'interactive'){
  TBOX.LayoutEditor.init();
} else {
  document.addEventListener('DOMContentLoaded', function(){ TBOX.LayoutEditor.init(); });
}