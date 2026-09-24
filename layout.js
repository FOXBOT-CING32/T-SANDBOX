/* ============================================================
 * layout.js · UI 布局编辑器逻辑（V1.0.0 · 就地编辑 + 自动保存）
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.LayoutEditor = {
  editing: true,
  selected: null,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  _toastTimer: null,
  _savedLayout: null,

  /* 默认布局（归一化，0~1，与 game.html 一致） */
  DEFAULTS: {
    /* 左手次要攻击 */
    btnJab:       { x: 0.255, y: 0.92, w: 0.065, h: 0.12 },
    btnHook:      { x: 0.255, y: 0.78, w: 0.065, h: 0.12 },
    btnElbowL:    { x: 0.255, y: 0.64, w: 0.065, h: 0.12 },
    btnHammerL:   { x: 0.255, y: 0.50, w: 0.065, h: 0.12 },

    /* 右手主要攻击 */
    btnCross:     { x: 0.955, y: 0.92, w: 0.065, h: 0.12 },
    btnHookR:     { x: 0.955, y: 0.78, w: 0.065, h: 0.12 },
    btnElbowR:    { x: 0.955, y: 0.64, w: 0.065, h: 0.12 },
    btnPalmR:     { x: 0.955, y: 0.50, w: 0.065, h: 0.12 },

    /* 腿部键 + 视角/检视 */
    btnLeftKick:  { x: 0.385, y: 0.92, w: 0.055, h: 0.10 },
    btnRightKick: { x: 0.465, y: 0.92, w: 0.055, h: 0.10 },
    btnBackSpin:  { x: 0.385, y: 0.80, w: 0.055, h: 0.10 },
    btnKnee:      { x: 0.465, y: 0.80, w: 0.055, h: 0.10 },
    btnView:      { x: 0.385, y: 0.68, w: 0.055, h: 0.10 },
    btnInspect:   { x: 0.465, y: 0.68, w: 0.055, h: 0.10 },

    /* 功能键 */
    btnJump:      { x: 0.875, y: 0.92, w: 0.055, h: 0.10 },
    btnCrouch:    { x: 0.875, y: 0.80, w: 0.055, h: 0.10 },
    btnSprint:    { x: 0.875, y: 0.68, w: 0.055, h: 0.10 },
    btnBlock:     { x: 0.875, y: 0.56, w: 0.055, h: 0.10 },
    btnClimb:     { x: 0.875, y: 0.44, w: 0.055, h: 0.10 }
  },

  init(){
    this.editing = true;
    this._cleanOldLayoutIfNeeded();
    this.reapplyCurrentLayout();
    this.bindKeys();
    this.bindButtons();
    this.bindDrag();
    this.toast('拖动按钮调整位置 · 自动保存');

    var self = this;
    window.addEventListener('resize', function(){ self.reapplyCurrentLayout(); });
  },

  _cleanOldLayoutIfNeeded(){
    try {
      var raw = localStorage.getItem('tbox_uiLayout');
      if(!raw) return;
      var layout = JSON.parse(raw);
      var firstKey = Object.keys(layout)[0];
      if(!firstKey) return;
      var d = layout[firstKey];
      if(d.left !== undefined || d.top !== undefined || d.right !== undefined || d.bottom !== undefined){
        localStorage.removeItem('tbox_uiLayout');
        console.log('[TBOX.Layout] 检测到旧格式布局，已自动清除');
      }
    } catch(e){
      try { localStorage.removeItem('tbox_uiLayout'); } catch(err){}
    }
  },

  reapplyCurrentLayout(){
    var preview = document.getElementById('preview');
    if(!preview) return;
    var prect = preview.getBoundingClientRect();
    var self = this;

    document.querySelectorAll('.key').forEach(function(el){
      var id = el.dataset ? el.dataset.id : el.id;
      if(!id) return;

      var d = null;
      var saved = self._savedLayout || {};
      if(saved[id]){
        d = saved[id];
      } else if(self.DEFAULTS[id]){
        d = self.DEFAULTS[id];
      } else {
        return;
      }

      var pw = (d.w !== undefined ? d.w : 0.06) * prect.width;
      var ph = (d.h !== undefined ? d.h : 0.12) * prect.height;
      var px = d.x * prect.width;
      var py = d.y * prect.height;

      el.style.left = (px - pw / 2) + 'px';
      el.style.top  = (py - ph / 2) + 'px';
      el.style.width = pw + 'px';
      el.style.height = ph + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });
  },

  bindKeys(){
    var self = this;
    document.querySelectorAll('.key').forEach(function(k){
      k.addEventListener('mousedown', function(){ self.select(k); });
      k.addEventListener('touchstart', function(){ self.select(k); }, { passive: true });
    });
  },

  select(el){
    document.querySelectorAll('.key').forEach(function(x){
      x.classList.remove('selected');
    });
    el.classList.add('selected');
    this.selected = el;
    var id = el.dataset ? (el.dataset.id || el.id) : el.id;
    var elSel = document.getElementById('valSelected');
    if(elSel) elSel.textContent = id || '—';
    this.updatePosLabel();
  },

  updatePosLabel(){
    var elPos = document.getElementById('valPos');
    if(!elPos) return;
    if(!this.selected){ elPos.textContent = '—'; return; }
    var preview = document.getElementById('preview');
    var rect = this.selected.getBoundingClientRect();
    var prect = preview.getBoundingClientRect();
    var nxp = ((rect.left + rect.width / 2 - prect.left) / prect.width).toFixed(3);
    var nyp = ((rect.top + rect.height / 2 - prect.top) / prect.height).toFixed(3);
    elPos.textContent = nxp + ', ' + nyp;
  },

  bindDrag(){
    var self = this;
    var preview = document.getElementById('preview');
    if(!preview) return;

    function startDrag(e){
      if(!self.editing) return;
      var t = e.target.closest('.key');
      if(!t) return;
      e.preventDefault();
      self.select(t);
      self.dragTarget = t;
      var point = e.touches ? e.touches[0] : e;
      var rect = t.getBoundingClientRect();
      self.dragOffset.x = point.clientX - rect.left;
      self.dragOffset.y = point.clientY - rect.top;
    }

    function moveDrag(e){
      if(!self.dragTarget) return;
      e.preventDefault();
      var point = e.touches ? e.touches[0] : e;
      var prect = preview.getBoundingClientRect();
      var x = point.clientX - prect.left - self.dragOffset.x;
      var y = point.clientY - prect.top - self.dragOffset.y;
      var w = self.dragTarget.offsetWidth;
      var h = self.dragTarget.offsetHeight;
      x = Math.max(0, Math.min(prect.width - w, x));
      y = Math.max(0, Math.min(prect.height - h, y));
      self.dragTarget.style.left = x + 'px';
      self.dragTarget.style.top = y + 'px';
      self.dragTarget.style.right = 'auto';
      self.dragTarget.style.bottom = 'auto';
      self.updatePosLabel();
    }

    function endDrag(){
      if(!self.dragTarget) return;
      self.dragTarget = null;
      /* ★ 自动保存 */
      self.save();
    }

    preview.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    preview.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);
  },

  bindButtons(){
    var self = this;

    var back = document.getElementById('btnBack');
    if(back) back.addEventListener('click', function(){
      self.save();
      window.location.href = 'index.html';
    });

    var save = document.getElementById('btnSave');
    if(save) save.addEventListener('click', function(){
      self.save();
      self.toast('已保存');
    });

    var auto = document.getElementById('btnAuto');
    if(auto) auto.addEventListener('click', function(){
      self.autoLayout();
    });

    var reset = document.getElementById('btnReset');
    if(reset) reset.addEventListener('click', function(){
      self.reset();
    });
  },

  autoLayout(){
    document.querySelectorAll('.key').forEach(function(el){
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
      el.style.width = '';
      el.style.height = '';
    });
    this._savedLayout = null;
    try { localStorage.removeItem('tbox_uiLayout'); } catch(e){}
    this.reapplyCurrentLayout();
    this.toast('已应用自动布局');
  },

  save(){
    try {
      var preview = document.getElementById('preview');
      if(!preview) return;
      var prect = preview.getBoundingClientRect();
      var layout = {};

      document.querySelectorAll('.key').forEach(function(el){
        var id = el.dataset ? el.dataset.id : el.id;
        if(!id) return;
        var rect = el.getBoundingClientRect();
        layout[id] = {
          x: (rect.left + rect.width / 2 - prect.left) / prect.width,
          y: (rect.top + rect.height / 2 - prect.top) / prect.height,
          w: rect.width / prect.width,
          h: rect.height / prect.height
        };
      });

      localStorage.setItem('tbox_uiLayout', JSON.stringify(layout));
      this._savedLayout = layout;
    } catch(e){
      console.warn('保存失败', e);
    }
  },

  reset(){
    if(!confirm('确定要重置布局吗？')) return;
    try { localStorage.removeItem('tbox_uiLayout'); } catch(e){}
    this._savedLayout = null;
    this.reapplyCurrentLayout();
    this.toast('已重置');
  },

  toast(msg){
    var t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1500);
  }
};

if(document.readyState === 'complete' || document.readyState === 'interactive'){
  TBOX.LayoutEditor.init();
} else {
  document.addEventListener('DOMContentLoaded', function(){
    TBOX.LayoutEditor.init();
  });
}