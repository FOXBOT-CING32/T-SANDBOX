/* ============================================================
 * spawnmenu.js · 生成菜单系统
 * V1.0.0 · 90 形状 × 12 大小 × 60 颜色 · 90 独立 SVG
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.SpawnMenu = {
  root: null,
  tree: null,
  gridArea: null,
  gridPhantom: null,
  gridView: null,
  crumb: null,
  emptyEl: null,
  countEl: null,
  searchEl: null,
  ctx: null,

  opened: false,
  currentTab: 'spawn',
  currentNode: null,
  currentList: [],
  selectedId: null,

  ICON_SIZE: 140,
  ICON_GAP: 12,
  ROW_HEIGHT: 152,
  BUFFER_ROWS: 3,
  _rows: 0,
  _cols: 0,
  _scrollBound: false,

  /* ============================================================
   * 形状定义（90 种，9 大类）
   * ============================================================ */
  SHAPE_GROUPS: [
    {
      id: 'polyhedron', label: '多面体',
      shapes: [
        { id: 'cube',           label: '正方体' },
        { id: 'cuboid',         label: '长方体' },
        { id: 'tetrahedron',    label: '正四面体' },
        { id: 'octahedron',     label: '正八面体' },
        { id: 'dodecahedron',   label: '正十二面体' },
        { id: 'icosahedron',    label: '正二十面体' },
        { id: 'sphere',         label: '球体' },
        { id: 'hemisphere',     label: '半球' },
        { id: 'quarter-sphere', label: '四分之一球' },
        { id: 'capsule',        label: '胶囊' }
      ]
    },
    {
      id: 'prism', label: '棱柱',
      shapes: [
        { id: 'prism3',  label: '三棱柱' },
        { id: 'prism4',  label: '四棱柱' },
        { id: 'prism5',  label: '五棱柱' },
        { id: 'prism6',  label: '六棱柱' },
        { id: 'prism8',  label: '八棱柱' },
        { id: 'prism12', label: '十二棱柱' },
        { id: 'prism16', label: '十六棱柱' }
      ]
    },
    {
      id: 'pyramid', label: '棱锥',
      shapes: [
        { id: 'pyramid3',  label: '三棱锥' },
        { id: 'pyramid4',  label: '四棱锥' },
        { id: 'pyramid5',  label: '五棱锥' },
        { id: 'pyramid6',  label: '六棱锥' },
        { id: 'pyramid8',  label: '八棱锥' },
        { id: 'pyramid12', label: '十二棱锥' },
        { id: 'pyramid16', label: '十六棱锥' }
      ]
    },
    {
      id: 'round', label: '圆柱 / 圆锥 / 圆盘',
      shapes: [
        { id: 'cylinder',        label: '圆柱体' },
        { id: 'cylinder-hollow', label: '空心圆柱' },
        { id: 'cone',            label: '圆锥' },
        { id: 'cone-truncated',  label: '圆台' },
        { id: 'disc',            label: '圆盘' },
        { id: 'disc-thick',      label: '厚圆盘' },
        { id: 'disc-hollow',     label: '空心圆盘' },
        { id: 'torus',           label: '圆环' },
        { id: 'torus-thick',     label: '厚圆环' },
        { id: 'torus-half',      label: '半圆环' }
      ]
    },
    {
      id: 'ramp', label: '楔形 / 斜坡 / 台阶',
      shapes: [
        { id: 'wedge',         label: '楔形' },
        { id: 'wedge-curved',  label: '曲面楔形' },
        { id: 'ramp',          label: '斜坡' },
        { id: 'ramp-curved',   label: '曲面斜坡' },
        { id: 'step',          label: '台阶' },
        { id: 'stair',         label: '楼梯' },
        { id: 'stair-spiral',  label: '旋转楼梯' },
        { id: 'arch',          label: '拱形' },
        { id: 'arch-half',     label: '半拱' }
      ]
    },
    {
      id: 'special', label: '特殊形状',
      shapes: [
        { id: 'cross',     label: '十字' },
        { id: 'star3',     label: '三角星' },
        { id: 'star4',     label: '四角星' },
        { id: 'star5',     label: '五角星' },
        { id: 'star6',     label: '六角星' },
        { id: 'star8',     label: '八角星' },
        { id: 'ring',      label: '环' },
        { id: 'ring-square', label: '方环' },
        { id: 'L-shape',   label: 'L 形' },
        { id: 'T-shape',   label: 'T 形' },
        { id: 'U-shape',   label: 'U 形' },
        { id: 'H-shape',   label: 'H 形' },
        { id: 'I-shape',   label: 'I 形' },
        { id: 'plus',      label: '加号' },
        { id: 'minus',     label: '减号' },
        { id: 'slash',     label: '斜杠' },
        { id: 'backslash', label: '反斜杠' }
      ]
    },
    {
      id: 'plate', label: '薄片 / 面板',
      shapes: [
        { id: 'plate-square', label: '方形板' },
        { id: 'plate-rect',   label: '长方形板' },
        { id: 'plate-tri',    label: '三角板' },
        { id: 'plate-hex',    label: '六边形板' },
        { id: 'plate-oct',    label: '八边形板' },
        { id: 'plate-circle', label: '圆板' },
        { id: 'plate-ring',   label: '圆环板' },
        { id: 'plate-star',   label: '星形板' }
      ]
    },
    {
      id: 'rod', label: '细杆 / 管',
      shapes: [
        { id: 'rod',           label: '细杆' },
        { id: 'rod-square',    label: '方杆' },
        { id: 'rod-hex',       label: '六棱杆' },
        { id: 'tube',          label: '空心管' },
        { id: 'tube-square',   label: '方管' },
        { id: 'tube-hex',      label: '六棱管' },
        { id: 'frame',         label: '框架' },
        { id: 'frame-square',  label: '方框架' },
        { id: 'frame-circle',  label: '圆框架' }
      ]
    },
    {
      id: 'complex', label: '复杂组合体',
      shapes: [
        { id: 'gear',         label: '齿轮' },
        { id: 'gear-thick',   label: '厚齿轮' },
        { id: 'wheel',        label: '轮子' },
        { id: 'wheel-spoke',  label: '辐条轮' },
        { id: 'bar',          label: '长条' },
        { id: 'bar-curved',   label: '弧形条' },
        { id: 'beam',         label: '梁' },
        { id: 'beam-curved',  label: '弧形梁' },
        { id: 'panel',        label: '面板' },
        { id: 'panel-curved', label: '弧形面板' },
        { id: 'bracket',      label: '支架' },
        { id: 'bracket-L',    label: 'L 支架' },
        { id: 'bracket-T',    label: 'T 支架' }
      ]
    }
  ],

  SIZES: [
    { id: 'xs',   label: '极小',   scale: 0.1 },
    { id: 'xxs',  label: '微小',   scale: 0.25 },
    { id: 's',    label: '小',     scale: 0.5 },
    { id: 'sm',   label: '中小',   scale: 0.75 },
    { id: 'm',    label: '中',     scale: 1.0 },
    { id: 'ml',   label: '中大',   scale: 1.5 },
    { id: 'l',    label: '大',     scale: 2.0 },
    { id: 'xl',   label: '特大',   scale: 3.0 },
    { id: 'xxl',  label: '巨大',   scale: 4.0 },
    { id: 'huge', label: '超大',   scale: 6.0 },
    { id: 'giant',label: '巨型',   scale: 8.0 },
    { id: 'titan',label: '超大巨型', scale: 10.0 }
  ],

  COLORS: [
    { id: 'red',      label: '红',   hex: '#e74c3c' },
    { id: 'orange',   label: '橙',   hex: '#e67e22' },
    { id: 'yellow',   label: '黄',   hex: '#f1c40f' },
    { id: 'green',    label: '绿',   hex: '#2ecc71' },
    { id: 'cyan',     label: '青',   hex: '#1abc9c' },
    { id: 'blue',     label: '蓝',   hex: '#3498db' },
    { id: 'purple',   label: '紫',   hex: '#9b59b6' },
    { id: 'pink',     label: '粉',   hex: '#e84393' },
    { id: 'brown',    label: '棕',   hex: '#8B5A2B' },
    { id: 'gray',     label: '灰',   hex: '#7f8c8d' },
    { id: 'black',    label: '黑',   hex: '#2c3e50' },
    { id: 'white',    label: '白',   hex: '#ecf0f1' },
    { id: 'beige',    label: '米',   hex: '#d4c5a0' },
    { id: 'gold',     label: '金',   hex: '#d4af37' },
    { id: 'silver',   label: '银',   hex: '#bdc3c7' },
    { id: 'copper',   label: '铜',   hex: '#b87333' },
    { id: 'iron',     label: '铁',   hex: '#5d6d7e' },
    { id: 'steel',    label: '钢',   hex: '#8395a7' },
    { id: 'wood',     label: '木',   hex: '#a0522d' },
    { id: 'stone',    label: '石',   hex: '#95a5a6' },
    { id: 'brick',    label: '砖',   hex: '#a93226' },
    { id: 'sand',     label: '沙',   hex: '#e1c699' },
    { id: 'dirt',     label: '土',   hex: '#6e4b2a' },
    { id: 'grass',    label: '草',   hex: '#5fa052' },
    { id: 'leaf',     label: '叶',   hex: '#3d8b3d' },
    { id: 'flower',   label: '花',   hex: '#ff6b9d' },
    { id: 'fruit',    label: '果',   hex: '#ff8c42' },
    { id: 'meat',     label: '肉',   hex: '#c0392b' },
    { id: 'skin',     label: '皮',   hex: '#e0b090' },
    { id: 'bone',     label: '骨',   hex: '#f0e6d2' },
    { id: 'dark-red',     label: '深红', hex: '#8b1a1a' },
    { id: 'light-red',    label: '亮红', hex: '#ff6b6b' },
    { id: 'deep-red',     label: '暗红', hex: '#5c0e0e' },
    { id: 'dark-orange',  label: '深橙', hex: '#a04000' },
    { id: 'light-orange', label: '亮橙', hex: '#ffa94d' },
    { id: 'deep-orange',  label: '暗橙', hex: '#6e2c00' },
    { id: 'dark-yellow',  label: '深黄', hex: '#b7950b' },
    { id: 'light-yellow', label: '亮黄', hex: '#ffe066' },
    { id: 'deep-yellow',  label: '暗黄', hex: '#7d6608' },
    { id: 'dark-green',   label: '深绿', hex: '#1e8449' },
    { id: 'light-green',  label: '亮绿', hex: '#7bed9f' },
    { id: 'deep-green',   label: '暗绿', hex: '#0e4d2a' },
    { id: 'dark-cyan',    label: '深青', hex: '#117a65' },
    { id: 'light-cyan',   label: '亮青', hex: '#76e4d0' },
    { id: 'deep-cyan',    label: '暗青', hex: '#0a4a3d' },
    { id: 'dark-blue',    label: '深蓝', hex: '#1f4e79' },
    { id: 'light-blue',   label: '亮蓝', hex: '#74b9ff' },
    { id: 'deep-blue',    label: '暗蓝', hex: '#0c2d48' },
    { id: 'dark-purple',  label: '深紫', hex: '#5b2c6f' },
    { id: 'light-purple', label: '亮紫', hex: '#c39bd3' },
    { id: 'deep-purple',  label: '暗紫', hex: '#2e0f42' },
    { id: 'dark-pink',    label: '深粉', hex: '#a03362' },
    { id: 'light-pink',   label: '亮粉', hex: '#ffb8d1' },
    { id: 'deep-pink',    label: '暗粉', hex: '#5c1a35' },
    { id: 'dark-brown',   label: '深棕', hex: '#5a3a1a' },
    { id: 'light-brown',  label: '亮棕', hex: '#c89b6a' },
    { id: 'dark-gray',    label: '深灰', hex: '#4a4a4a' },
    { id: 'light-gray',   label: '亮灰', hex: '#c8c8c8' },
    { id: 'dark-black',   label: '深黑', hex: '#111111' },
    { id: 'light-white',  label: '亮白', hex: '#ffffff' }
  ],

  init(){
    this.root = document.getElementById('spawnmenu-root');
    if(!this.root) return;

    this.tree = document.getElementById('smTree');
    this.gridArea = document.getElementById('smGridArea');
    this.gridPhantom = document.getElementById('smGridPhantom');
    this.gridView = document.getElementById('smGridView');
    this.crumb = document.getElementById('smCrumb');
    this.emptyEl = document.getElementById('smEmpty');
    this.countEl = document.getElementById('smCount');
    this.searchEl = document.getElementById('smSearch');
    this.ctx = document.getElementById('spawnmenu-ctx');

    this._bindTop();
    this._bindTabs();
    this._bindRightTabs();
    this._bindTree();
    this._bindGridScroll();
    this._bindSearch();
    this._bindClock();
    this._bindContextMenu();
    this._bindClose();

    this._buildTree();
    this._clockTick();
  },

  _bindTop(){
    var self = this;
    var closeBtn = document.getElementById('smClose');
    if(closeBtn) closeBtn.addEventListener('click', function(){ self.close(); });
  },

  _bindTabs(){
    var self = this;
    var tabs = document.querySelectorAll('#smTabs .sm-tab');
    tabs.forEach(function(t){
      t.addEventListener('click', function(){
        tabs.forEach(function(x){ x.classList.remove('active'); });
        t.classList.add('active');
        self.currentTab = t.dataset.tab;
        self.currentNode = null;
        self.currentList = [];
        self._buildTree();
        self._renderGrid();
      });
    });
  },

  _bindRightTabs(){
    var tabs = document.querySelectorAll('#smSide .sm-rtab');
    tabs.forEach(function(t){
      t.addEventListener('click', function(){
        tabs.forEach(function(x){ x.classList.remove('active'); });
        t.classList.add('active');
        var tools = document.getElementById('smTools');
        var props = document.getElementById('smProps');
        if(t.dataset.r === 'tools'){
          if(tools) tools.style.display = 'block';
          if(props) props.style.display = 'none';
        } else {
          if(tools) tools.style.display = 'none';
          if(props) props.style.display = 'block';
        }
      });
    });
  },

  _bindTree(){
    var self = this;
    if(!this.tree) return;
    this.tree.addEventListener('click', function(e){
      var ph = e.target.closest('.sm-ph');
      if(ph){
        var pkg = ph.parentNode;
        if(pkg) pkg.classList.toggle('open');
        return;
      }
      var it = e.target.closest('.sm-it');
      if(it){
        var shapeId = it.dataset.shape;
        if(!shapeId) return;
        self.tree.querySelectorAll('.sm-it').forEach(function(x){ x.classList.remove('active'); });
        it.classList.add('active');
        self.currentNode = shapeId;
        self._buildList(shapeId);
        self._renderGrid();
      }
    });
  },

  _bindGridScroll(){
    var self = this;
    if(!this.gridArea) return;
    if(this._scrollBound) return;
    this._scrollBound = true;
    this.gridArea.addEventListener('scroll', function(){
      self._renderVisibleRows();
    });
  },

  _bindSearch(){
    var self = this;
    if(!this.searchEl) return;
    this.searchEl.addEventListener('input', function(){
      var q = self.searchEl.value.trim();
      if(self.currentTab !== 'spawn') return;
      if(q){
        self._search(q);
      } else if(self.currentNode){
        self._buildList(self.currentNode);
      }
      self._renderGrid();
    });
    this.searchEl.addEventListener('keydown', function(e){ e.stopPropagation(); });
  },

  _bindClock(){
    var self = this;
    setInterval(function(){ self._clockTick(); }, 1000);
  },

  _clockTick(){
    var el = document.getElementById('smClock');
    if(!el) return;
    var d = new Date();
    el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  },

  _bindContextMenu(){
    var self = this;
    document.addEventListener('click', function(e){
      if(self.ctx && !self.ctx.contains(e.target)) self.ctx.style.display = 'none';
    });
  },

  _bindClose(){
    var self = this;
    document.addEventListener('keydown', function(e){
      if(!self.opened) return;
      if(e.key === 'Escape'){ e.preventDefault(); self.close(); }
    });
  },

  _buildTree(){
    if(!this.tree) return;
    this.tree.innerHTML = '';

    if(this.currentTab !== 'spawn'){
      var div = document.createElement('div');
      div.className = 'sm-ph';
      div.textContent = '暂无内容';
      div.style.cursor = 'default';
      this.tree.appendChild(div);
      return;
    }

    var self = this;
    this.SHAPE_GROUPS.forEach(function(group){
      var pkg = document.createElement('div');
      pkg.className = 'sm-pkg open';
      var ph = document.createElement('div');
      ph.className = 'sm-ph';
      ph.textContent = group.label;
      pkg.appendChild(ph);
      var plist = document.createElement('div');
      plist.className = 'sm-plist';
      group.shapes.forEach(function(shape){
        var it = document.createElement('div');
        it.className = 'sm-it';
        it.dataset.shape = shape.id;
        var count = self.SIZES.length * self.COLORS.length;
        it.innerHTML = shape.label + '<span class="sm-cnt">(' + count + ')</span>';
        plist.appendChild(it);
      });
      pkg.appendChild(plist);
      self.tree.appendChild(pkg);
    });

    if(!this.currentNode){
      var first = this.tree.querySelector('.sm-it');
      if(first){
        first.classList.add('active');
        this.currentNode = first.dataset.shape;
        this._buildList(this.currentNode);
        this._renderGrid();
      }
    }
  },

  _buildList(shapeId){
    var shape = this._findShape(shapeId);
    if(!shape){ this.currentList = []; return; }
    var list = [];
    for(var s = 0; s < this.SIZES.length; s++){
      for(var c = 0; c < this.COLORS.length; c++){
        var size = this.SIZES[s];
        var color = this.COLORS[c];
        list.push({
          id: shapeId + '_' + size.id + '_' + color.id,
          shapeId: shapeId,
          shapeLabel: shape.label,
          sizeId: size.id,
          sizeLabel: size.label,
          sizeScale: size.scale,
          colorId: color.id,
          colorLabel: color.label,
          colorHex: color.hex,
          label: shape.label + ' · ' + size.label + ' · ' + color.label
        });
      }
    }
    this.currentList = list;
  },

  _search(q){
    var lower = q.toLowerCase();
    var all = [];
    var self = this;
    this.SHAPE_GROUPS.forEach(function(group){
      group.shapes.forEach(function(shape){
        for(var s = 0; s < self.SIZES.length; s++){
          for(var c = 0; c < self.COLORS.length; c++){
            var size = self.SIZES[s];
            var color = self.COLORS[c];
            var label = shape.label + ' · ' + size.label + ' · ' + color.label;
            if(label.toLowerCase().indexOf(lower) >= 0 || shape.id.indexOf(lower) >= 0){
              all.push({
                id: shape.id + '_' + size.id + '_' + color.id,
                shapeId: shape.id,
                shapeLabel: shape.label,
                sizeId: size.id,
                sizeLabel: size.label,
                sizeScale: size.scale,
                colorId: color.id,
                colorLabel: color.label,
                colorHex: color.hex,
                label: label
              });
              if(all.length > 2000) break;
            }
          }
          if(all.length > 2000) return;
        }
      });
    });
    this.currentList = all;
  },

  _findShape(shapeId){
    for(var i = 0; i < this.SHAPE_GROUPS.length; i++){
      var g = this.SHAPE_GROUPS[i];
      for(var j = 0; j < g.shapes.length; j++){
        if(g.shapes[j].id === shapeId) return g.shapes[j];
      }
    }
    return null;
  },

  _renderGrid(){
    if(!this.gridArea || !this.gridPhantom || !this.gridView) return;
    if(this.currentTab !== 'spawn'){
      this.gridArea.style.display = 'none';
      if(this.emptyEl) this.emptyEl.style.display = 'flex';
      this._updateCrumb();
      return;
    }
    this.gridArea.style.display = 'block';
    if(this.emptyEl) this.emptyEl.style.display = 'none';
    var total = this.currentList.length;
    this._updateCrumb();
    if(total === 0){
      this.gridPhantom.style.height = '0px';
      this.gridView.innerHTML = '';
      this.gridView.style.transform = 'translateY(0px)';
      return;
    }
    var areaW = this.gridArea.clientWidth - 28;
    var cols = Math.max(1, Math.floor((areaW + this.ICON_GAP) / (this.ICON_SIZE + this.ICON_GAP)));
    this._cols = cols;
    var rows = Math.ceil(total / cols);
    this._rows = rows;
    var totalH = rows * this.ROW_HEIGHT + 14;
    this.gridPhantom.style.height = totalH + 'px';
    this.gridView.innerHTML = '';
    this.gridView.style.transform = 'translateY(0px)';
    this._renderVisibleRows();
  },

  _renderVisibleRows(){
    if(!this.gridArea || !this.gridView) return;
    var total = this.currentList.length;
    if(total === 0) return;
    var cols = this._cols;
    var scrollTop = this.gridArea.scrollTop;
    var areaH = this.gridArea.clientHeight;
    var startRow = Math.max(0, Math.floor(scrollTop / this.ROW_HEIGHT) - this.BUFFER_ROWS);
    var endRow = Math.min(this._rows, Math.ceil((scrollTop + areaH) / this.ROW_HEIGHT) + this.BUFFER_ROWS);
    var startIdx = startRow * cols;
    var endIdx = Math.min(total, endRow * cols);
    var html = '';
    for(var i = startIdx; i < endIdx; i++){
      var item = this.currentList[i];
      var svg = this._buildSvg(item.shapeId, item.colorHex);
      var sel = (item.id === this.selectedId) ? ' sel' : '';
      html += '<div class="sm-icon' + sel + '" data-id="' + item.id + '" data-idx="' + i + '">' +
        svg + '<div class="sm-lbl" title="' + item.label + '">' + item.label + '</div></div>';
    }
    this.gridView.innerHTML = html;
    this.gridView.style.transform = 'translateY(' + (startRow * this.ROW_HEIGHT) + 'px)';
    var self = this;
    this.gridView.querySelectorAll('.sm-icon').forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.dataset.id;
        var idx = Number(el.dataset.idx);
        self.selectedId = id;
        self.gridView.querySelectorAll('.sm-icon').forEach(function(x){ x.classList.remove('sel'); });
        el.classList.add('sel');
        var item = self.currentList[idx];
        if(item) self._spawn(item);
      });
      el.addEventListener('contextmenu', function(e){
        e.preventDefault();
        var idx = Number(el.dataset.idx);
        var item = self.currentList[idx];
        self._openCtx(e.clientX, e.clientY, item);
      });
    });
  },

  _updateCrumb(){
    if(!this.crumb) return;
    if(this.currentTab !== 'spawn'){ this.crumb.textContent = '暂无内容'; return; }
    var shape = this._findShape(this.currentNode);
    if(shape){
      this.crumb.innerHTML = '生成物 / <span>' + shape.label + '</span> · 共 <span>' + this.currentList.length + '</span> 个';
    } else {
      this.crumb.textContent = '生成物 / …';
    }
  },

  /* ============================================================
   * SVG 图标 · 90 形状独立绘制
   * ============================================================ */
  _buildSvg(shapeId, colorHex){
    var c = colorHex || '#cccccc';
    var dark = this._darken(c, 0.30);
    var light = this._lighten(c, 0.25);
    var body = this._svgDispatch(shapeId, c, dark, light);
    return '<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
      '<rect x="0" y="0" width="140" height="140" fill="#1f2123"/>' + body + '</svg>';
  },

  /* 生成正 N 边形顶点（cx, cy 中心，r 半径，n 边数，rot 起始角） */
  _polyPts(cx, cy, r, n, rot, ry){
    ry = ry === undefined ? r : ry;
    var pts = [];
    for(var i = 0; i < n; i++){
      var a = rot + i * 2 * Math.PI / n;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * ry).toFixed(1));
    }
    return pts;
  },

  /* 生成正 N 边形顶点（用于 path d，返回 "x,y" 格式，不带逗号） */
  _polyPath(cx, cy, r, n, rot, ry){
    ry = ry === undefined ? r : ry;
    var s = '';
    for(var i = 0; i < n; i++){
      var a = rot + i * 2 * Math.PI / n;
      s += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * ry).toFixed(1) + ' ';
    }
    return s + 'Z';
  },

  _svgDispatch(id, c, d, l){
    switch(id){
      case 'cube':            return this._svg_cube(c, d, l);
      case 'cuboid':          return this._svg_cuboid(c, d, l);
      case 'tetrahedron':     return this._svg_tetrahedron(c, d, l);
      case 'octahedron':      return this._svg_octahedron(c, d, l);
      case 'dodecahedron':    return this._svg_dodecahedron(c, d, l);
      case 'icosahedron':     return this._svg_icosahedron(c, d, l);
      case 'sphere':          return this._svg_sphere(c, d, l);
      case 'hemisphere':      return this._svg_hemisphere(c, d, l);
      case 'quarter-sphere':  return this._svg_quarter_sphere(c, d, l);
      case 'capsule':         return this._svg_capsule(c, d, l);
      case 'prism3':          return this._svg_prism3(c, d, l);
      case 'prism4':          return this._svg_prism4(c, d, l);
      case 'prism5':          return this._svg_prism5(c, d, l);
      case 'prism6':          return this._svg_prism6(c, d, l);
      case 'prism8':          return this._svg_prism8(c, d, l);
      case 'prism12':         return this._svg_prism12(c, d, l);
      case 'prism16':         return this._svg_prism16(c, d, l);
      case 'pyramid3':        return this._svg_pyramid3(c, d, l);
      case 'pyramid4':        return this._svg_pyramid4(c, d, l);
      case 'pyramid5':        return this._svg_pyramid5(c, d, l);
      case 'pyramid6':        return this._svg_pyramid6(c, d, l);
      case 'pyramid8':        return this._svg_pyramid8(c, d, l);
      case 'pyramid12':       return this._svg_pyramid12(c, d, l);
      case 'pyramid16':       return this._svg_pyramid16(c, d, l);
      case 'cylinder':        return this._svg_cylinder(c, d, l);
      case 'cylinder-hollow': return this._svg_cylinder_hollow(c, d, l);
      case 'cone':            return this._svg_cone(c, d, l);
      case 'cone-truncated':  return this._svg_cone_truncated(c, d, l);
      case 'disc':            return this._svg_disc(c, d, l);
      case 'disc-thick':      return this._svg_disc_thick(c, d, l);
      case 'disc-hollow':     return this._svg_disc_hollow(c, d, l);
      case 'torus':           return this._svg_torus(c, d, l);
      case 'torus-thick':     return this._svg_torus_thick(c, d, l);
      case 'torus-half':      return this._svg_torus_half(c, d, l);
      case 'wedge':           return this._svg_wedge(c, d, l);
      case 'wedge-curved':    return this._svg_wedge_curved(c, d, l);
      case 'ramp':            return this._svg_ramp(c, d, l);
      case 'ramp-curved':     return this._svg_ramp_curved(c, d, l);
      case 'step':            return this._svg_step(c, d, l);
      case 'stair':           return this._svg_stair(c, d, l);
      case 'stair-spiral':    return this._svg_stair_spiral(c, d, l);
      case 'arch':            return this._svg_arch(c, d, l);
      case 'arch-half':       return this._svg_arch_half(c, d, l);
      case 'cross':           return this._svg_cross(c, d, l);
      case 'star3':           return this._svg_star3(c, d, l);
      case 'star4':           return this._svg_star4(c, d, l);
      case 'star5':           return this._svg_star5(c, d, l);
      case 'star6':           return this._svg_star6(c, d, l);
      case 'star8':           return this._svg_star8(c, d, l);
      case 'ring':            return this._svg_ring(c, d, l);
      case 'ring-square':     return this._svg_ring_square(c, d, l);
      case 'L-shape':         return this._svg_L_shape(c, d, l);
      case 'T-shape':         return this._svg_T_shape(c, d, l);
      case 'U-shape':         return this._svg_U_shape(c, d, l);
      case 'H-shape':         return this._svg_H_shape(c, d, l);
      case 'I-shape':         return this._svg_I_shape(c, d, l);
      case 'plus':            return this._svg_plus(c, d, l);
      case 'minus':           return this._svg_minus(c, d, l);
      case 'slash':           return this._svg_slash(c, d, l);
      case 'backslash':       return this._svg_backslash(c, d, l);
      case 'plate-square':    return this._svg_plate_square(c, d, l);
      case 'plate-rect':      return this._svg_plate_rect(c, d, l);
      case 'plate-tri':       return this._svg_plate_tri(c, d, l);
      case 'plate-hex':       return this._svg_plate_hex(c, d, l);
      case 'plate-oct':       return this._svg_plate_oct(c, d, l);
      case 'plate-circle':    return this._svg_plate_circle(c, d, l);
      case 'plate-ring':      return this._svg_plate_ring(c, d, l);
      case 'plate-star':      return this._svg_plate_star(c, d, l);
      case 'rod':             return this._svg_rod(c, d, l);
      case 'rod-square':      return this._svg_rod_square(c, d, l);
      case 'rod-hex':         return this._svg_rod_hex(c, d, l);
      case 'tube':            return this._svg_tube(c, d, l);
      case 'tube-square':     return this._svg_tube_square(c, d, l);
      case 'tube-hex':        return this._svg_tube_hex(c, d, l);
      case 'frame':           return this._svg_frame(c, d, l);
      case 'frame-square':    return this._svg_frame_square(c, d, l);
      case 'frame-circle':    return this._svg_frame_circle(c, d, l);
      case 'gear':            return this._svg_gear(c, d, l);
      case 'gear-thick':      return this._svg_gear_thick(c, d, l);
      case 'wheel':           return this._svg_wheel(c, d, l);
      case 'wheel-spoke':     return this._svg_wheel_spoke(c, d, l);
      case 'bar':             return this._svg_bar(c, d, l);
      case 'bar-curved':      return this._svg_bar_curved(c, d, l);
      case 'beam':            return this._svg_beam(c, d, l);
      case 'beam-curved':     return this._svg_beam_curved(c, d, l);
      case 'panel':           return this._svg_panel(c, d, l);
      case 'panel-curved':    return this._svg_panel_curved(c, d, l);
      case 'bracket':         return this._svg_bracket(c, d, l);
      case 'bracket-L':       return this._svg_bracket_L(c, d, l);
      case 'bracket-T':       return this._svg_bracket_T(c, d, l);
      default:                return '<text x="70" y="75" text-anchor="middle" fill="#fff" font-size="14">?</text>';
    }
  },

  /* ---------- 多面体 ---------- */

  _svg_cube(c, d, l){
    return '' +
      '<path d="M70 35 L100 50 L70 65 L40 50 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M40 50 L70 65 L70 105 L40 90 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M100 50 L100 90 L70 105 L70 65 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_cuboid(c, d, l){
    return '' +
      '<path d="M70 38 L115 52 L70 66 L25 52 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 52 L70 66 L70 98 L25 84 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M115 52 L115 84 L70 98 L70 66 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_tetrahedron(c, d, l){
    return '' +
      '<path d="M70 25 L110 100 L70 100 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M70 25 L30 100 L70 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M30 100 L110 100 L70 115 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_octahedron(c, d, l){
    return '' +
      '<path d="M70 20 L105 70 L70 70 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M70 20 L35 70 L70 70 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M35 70 L70 70 L70 120 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M105 70 L70 70 L70 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_dodecahedron(c, d, l){
    return '' +
      '<polygon points="70,20 100,35 110,65 90,90 50,90 30,65 40,35" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="70,20 100,35 70,50 40,35" fill="' + l + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<polygon points="100,35 110,65 80,80 70,50" fill="' + d + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<polygon points="40,35 70,50 80,80 50,90 30,65" fill="' + c + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<polygon points="80,80 110,65 90,90" fill="' + d + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>';
  },

  _svg_icosahedron(c, d, l){
    return '' +
      '<polygon points="70,20 100,40 100,75 70,95 40,75 40,40" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="70,20 100,40 70,55 40,40" fill="' + l + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>' +
      '<polygon points="100,40 100,75 70,75 70,55" fill="' + d + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>' +
      '<polygon points="40,40 70,55 70,75 40,75" fill="' + c + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>' +
      '<polygon points="70,75 100,75 70,95" fill="' + d + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>' +
      '<polygon points="70,75 70,95 40,75" fill="' + c + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>';
  },

  _svg_sphere(c, d, l){
    return '' +
      '<circle cx="70" cy="70" r="45" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="45" ry="18" fill="none" stroke="#000" stroke-width="1" opacity="0.35"/>' +
      '<ellipse cx="70" cy="70" rx="18" ry="45" fill="none" stroke="#000" stroke-width="1" opacity="0.35"/>' +
      '<ellipse cx="70" cy="70" rx="34" ry="45" fill="none" stroke="#000" stroke-width="0.8" opacity="0.25"/>' +
      '<circle cx="55" cy="52" r="9" fill="' + l + '" opacity="0.8"/>' +
      '<circle cx="52" cy="49" r="4" fill="#fff" opacity="0.7"/>';
  },

  _svg_hemisphere(c, d, l){
    return '' +
      '<path d="M25 80 A45 45 0 0 1 115 80 L115 80 L25 80 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="70" cy="80" rx="45" ry="14" fill="' + d + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M45 60 Q70 40 95 60" fill="none" stroke="#000" stroke-width="1" opacity="0.3"/>' +
      '<circle cx="55" cy="58" r="6" fill="' + l + '" opacity="0.7"/>';
  },

  _svg_quarter_sphere(c, d, l){
    return '' +
      '<path d="M30 100 L30 60 A40 40 0 0 1 70 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M30 100 L70 100 L70 60 A40 40 0 0 0 30 60 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round" opacity="0.6"/>' +
      '<path d="M40 90 A30 30 0 0 1 60 70" fill="none" stroke="#000" stroke-width="1" opacity="0.3"/>' +
      '<circle cx="45" cy="80" r="5" fill="' + l + '" opacity="0.7"/>';
  },

  _svg_capsule(c, d, l){
    return '' +
      '<path d="M50 35 L50 105 A20 20 0 0 0 90 105 L90 35 A20 20 0 0 0 50 35 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="70" cy="35" rx="20" ry="8" fill="' + l + '" stroke="#000" stroke-width="1"/>' +
      '<ellipse cx="70" cy="105" rx="20" ry="8" fill="' + d + '" stroke="#000" stroke-width="1"/>' +
      '<line x1="50" y1="70" x2="90" y2="70" stroke="#000" stroke-width="1" opacity="0.3"/>';
  },

  /* ---------- 棱柱（统一用 _polyPts 生成多边形，避免拼错） ---------- */

  _svg_prism3(c, d, l){
    var top = this._polyPts(70, 35, 40, 3, -Math.PI / 2, 14);
    var bot = this._polyPts(70, 100, 40, 3, -Math.PI / 2, 14);
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<line x1="' + top[0].split(',')[0] + '" y1="35" x2="' + bot[0].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="' + top[1].split(',')[0] + '" y1="35" x2="' + bot[1].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="' + top[2].split(',')[0] + '" y1="35" x2="' + bot[2].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_prism4(c, d, l){
    var top = this._polyPts(70, 38, 38, 4, -Math.PI / 2 + Math.PI / 4, 14);
    var bot = this._polyPts(70, 100, 38, 4, -Math.PI / 2 + Math.PI / 4, 14);
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<line x1="' + top[0].split(',')[0] + '" y1="38" x2="' + bot[0].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="' + top[1].split(',')[0] + '" y1="38" x2="' + bot[1].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="' + top[2].split(',')[0] + '" y1="38" x2="' + bot[2].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="' + top[3].split(',')[0] + '" y1="38" x2="' + bot[3].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_prism5(c, d, l){
    var top = this._polyPts(70, 38, 40, 5, -Math.PI / 2, 14);
    var bot = this._polyPts(70, 100, 40, 5, -Math.PI / 2, 14);
    var edges = '';
    for(var i = 0; i < 5; i++){
      edges += '<line x1="' + top[i].split(',')[0] + '" y1="38" x2="' + bot[i].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>';
    }
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' + edges;
  },

  _svg_prism6(c, d, l){
    var top = this._polyPts(70, 38, 40, 6, 0, 14);
    var bot = this._polyPts(70, 100, 40, 6, 0, 14);
    var edges = '';
    for(var i = 0; i < 6; i++){
      edges += '<line x1="' + top[i].split(',')[0] + '" y1="38" x2="' + bot[i].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>';
    }
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' + edges;
  },

  _svg_prism8(c, d, l){
    var top = this._polyPts(70, 38, 40, 8, Math.PI / 8, 14);
    var bot = this._polyPts(70, 100, 40, 8, Math.PI / 8, 14);
    var edges = '';
    for(var i = 0; i < 8; i++){
      edges += '<line x1="' + top[i].split(',')[0] + '" y1="38" x2="' + bot[i].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1.5"/>';
    }
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' + edges;
  },

  _svg_prism12(c, d, l){
    var top = this._polyPts(70, 38, 42, 12, 0, 15);
    var bot = this._polyPts(70, 100, 42, 12, 0, 15);
    var edges = '';
    for(var i = 0; i < 12; i++){
      edges += '<line x1="' + top[i].split(',')[0] + '" y1="38" x2="' + bot[i].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1"/>';
    }
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' + edges;
  },

  _svg_prism16(c, d, l){
    var top = this._polyPts(70, 38, 42, 16, 0, 15);
    var bot = this._polyPts(70, 100, 42, 16, 0, 15);
    var edges = '';
    for(var i = 0; i < 16; i++){
      edges += '<line x1="' + top[i].split(',')[0] + '" y1="38" x2="' + bot[i].split(',')[0] + '" y2="100" stroke="#000" stroke-width="1"/>';
    }
    return '' +
      '<polygon points="' + top.join(' ') + '" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + bot.join(' ') + '" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' + edges;
  },

  /* ---------- 棱锥（用 path d 格式，避免 polygon 拼错） ---------- */

  _svg_pyramid3(c, d, l){
    var base = this._polyPts(70, 105, 40, 3, Math.PI / 2, 15);
    var apex = '70,25';
    var faces = '';
    for(var i = 0; i < 3; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 3];
      var fill = (i === 0) ? l : (i === 1 ? c : d);
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid4(c, d, l){
    var base = this._polyPts(70, 105, 42, 4, Math.PI / 4, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 4; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 4];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid5(c, d, l){
    var base = this._polyPts(70, 105, 42, 5, -Math.PI / 2, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 5; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 5];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid6(c, d, l){
    var base = this._polyPts(70, 105, 42, 6, 0, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 6; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 6];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid8(c, d, l){
    var base = this._polyPts(70, 105, 42, 8, Math.PI / 8, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 8; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 8];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid12(c, d, l){
    var base = this._polyPts(70, 105, 42, 12, 0, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 12; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 12];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="1" stroke-linejoin="round"/>';
    }
    return faces;
  },

  _svg_pyramid16(c, d, l){
    var base = this._polyPts(70, 105, 42, 16, 0, 16);
    var apex = '70,22';
    var faces = '';
    for(var i = 0; i < 16; i++){
      var b1 = base[i];
      var b2 = base[(i + 1) % 16];
      var fill = (i % 2 === 0) ? l : c;
      faces += '<polygon points="' + apex + ' ' + b1 + ' ' + b2 + '" fill="' + fill + '" stroke="#000" stroke-width="0.8" stroke-linejoin="round"/>';
    }
    return faces;
  },

  /* ---------- 圆柱 / 圆锥 / 圆盘 ---------- */

  _svg_cylinder(c, d, l){
    return '' +
      '<rect x="35" y="35" width="70" height="70" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="35" rx="35" ry="12" fill="' + l + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="105" rx="35" ry="12" fill="' + d + '" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="35" y1="35" x2="35" y2="105" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="105" y1="35" x2="105" y2="105" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_cylinder_hollow(c, d, l){
    return '' +
      '<rect x="35" y="35" width="70" height="70" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="35" rx="35" ry="12" fill="' + l + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="35" rx="18" ry="6" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="105" rx="35" ry="12" fill="' + d + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="105" rx="18" ry="6" fill="#1f2123" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_cone(c, d, l){
    return '' +
      '<path d="M70 20 L105 105 L35 105 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="70" cy="105" rx="35" ry="12" fill="' + d + '" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="70" y1="20" x2="35" y2="105" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="70" y1="20" x2="105" y2="105" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_cone_truncated(c, d, l){
    return '' +
      '<path d="M45 35 L95 35 L105 105 L35 105 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="70" cy="35" rx="25" ry="9" fill="' + l + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="105" rx="35" ry="12" fill="' + d + '" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_disc(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="42" ry="14" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="42" ry="14" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.6"/>' +
      '<ellipse cx="70" cy="70" rx="30" ry="10" fill="none" stroke="#000" stroke-width="0.8" opacity="0.35"/>';
  },

  _svg_disc_thick(c, d, l){
    return '' +
      '<ellipse cx="70" cy="60" rx="42" ry="14" fill="' + l + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M28 60 L28 80 A42 14 0 0 0 112 80 L112 60 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="70" cy="80" rx="42" ry="14" fill="' + d + '" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_disc_hollow(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="42" ry="14" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="20" ry="7" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="42" ry="14" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.5"/>';
  },

  _svg_torus(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="' + c + '" stroke-width="18"/>' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="36" ry="16" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.6"/>';
  },

  _svg_torus_thick(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="42" ry="20" fill="none" stroke="' + c + '" stroke-width="24"/>' +
      '<ellipse cx="70" cy="70" rx="42" ry="20" fill="none" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="30" ry="14" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.5"/>';
  },

  _svg_torus_half(c, d, l){
    return '' +
      '<path d="M25 70 A45 22 0 0 1 115 70" fill="none" stroke="' + c + '" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M25 70 A45 22 0 0 1 115 70" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +
      '<path d="M30 70 A40 18 0 0 1 110 70" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.5"/>';
  },

  /* ---------- 楔形 / 斜坡 / 台阶 ---------- */

  _svg_wedge(c, d, l){
    return '' +
      '<path d="M25 100 L25 70 L110 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 70 L110 100 L25 100 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round" opacity="0.6"/>' +
      '<path d="M25 70 L25 100 L110 100" fill="none" stroke="#000" stroke-width="1"/>';
  },

  _svg_wedge_curved(c, d, l){
    return '' +
      '<path d="M25 100 L25 70 Q70 50 110 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 70 Q70 50 110 100" fill="none" stroke="' + l + '" stroke-width="2"/>' +
      '<path d="M25 100 L110 100" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_ramp(c, d, l){
    return '' +
      '<path d="M20 100 L120 100 L120 40 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M20 100 L120 40" fill="none" stroke="' + l + '" stroke-width="2"/>' +
      '<path d="M20 100 L120 100" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_ramp_curved(c, d, l){
    return '' +
      '<path d="M20 100 L120 100 L120 40 Q70 60 20 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M20 100 Q70 60 120 40" fill="none" stroke="' + l + '" stroke-width="2"/>';
  },

  _svg_step(c, d, l){
    return '' +
      '<path d="M25 100 L25 80 L55 80 L55 60 L85 60 L85 40 L115 40 L115 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<line x1="25" y1="80" x2="55" y2="80" stroke="#000" stroke-width="1"/>' +
      '<line x1="55" y1="60" x2="85" y2="60" stroke="#000" stroke-width="1"/>' +
      '<line x1="85" y1="40" x2="115" y2="40" stroke="#000" stroke-width="1"/>';
  },

  _svg_stair(c, d, l){
    return '' +
      '<path d="M20 110 L20 95 L40 95 L40 80 L60 80 L60 65 L80 65 L80 50 L100 50 L100 35 L120 35 L120 110 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M20 95 L120 95" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.5"/>' +
      '<path d="M20 80 L120 80" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.5"/>' +
      '<path d="M20 65 L120 65" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.5"/>';
  },

  _svg_stair_spiral(c, d, l){
    return '' +
      '<path d="M70 110 Q30 110 30 90 Q30 70 70 70 Q110 70 110 50 Q110 30 70 30" fill="none" stroke="' + c + '" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M70 110 Q30 110 30 90 Q30 70 70 70 Q110 70 110 50 Q110 30 70 30" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
      '<path d="M70 110 Q30 110 30 90 Q30 70 70 70 Q110 70 110 50 Q110 30 70 30" fill="none" stroke="' + l + '" stroke-width="2" stroke-linecap="round" opacity="0.5"/>';
  },

  _svg_arch(c, d, l){
    return '' +
      '<path d="M25 100 L25 70 Q70 20 115 70 L115 100 L90 100 L90 70 Q70 45 50 70 L50 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M50 70 Q70 45 90 70" fill="none" stroke="' + d + '" stroke-width="1.5"/>';
  },

  _svg_arch_half(c, d, l){
    return '' +
      '<path d="M25 100 L25 70 Q70 20 70 70 L70 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M50 70 Q70 45 70 70" fill="none" stroke="' + d + '" stroke-width="1.5"/>';
  },

  /* ---------- 特殊形状 ---------- */

  _svg_cross(c, d, l){
    return '' +
      '<rect x="55" y="20" width="30" height="100" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="20" y="55" width="100" height="30" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="55" y="55" width="30" height="30" fill="' + l + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="55" y="20" width="30" height="35" fill="' + l + '" opacity="0.5"/>';
  },

  _svg_star3(c, d, l){
    var pts = [];
    for(var i = 0; i < 6; i++){
      var a = -Math.PI / 2 + i * Math.PI / 3;
      var r = (i % 2 === 0) ? 45 : 18;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_star4(c, d, l){
    var pts = [];
    for(var i = 0; i < 8; i++){
      var a = -Math.PI / 2 + i * Math.PI / 4;
      var r = (i % 2 === 0) ? 45 : 16;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_star5(c, d, l){
    var pts = [];
    for(var i = 0; i < 10; i++){
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var r = (i % 2 === 0) ? 45 : 18;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_star6(c, d, l){
    var pts = [];
    for(var i = 0; i < 12; i++){
      var a = -Math.PI / 2 + i * Math.PI / 6;
      var r = (i % 2 === 0) ? 45 : 20;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_star8(c, d, l){
    var pts = [];
    for(var i = 0; i < 16; i++){
      var a = -Math.PI / 2 + i * Math.PI / 8;
      var r = (i % 2 === 0) ? 45 : 22;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_ring(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="' + c + '" stroke-width="16"/>' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="36" ry="16" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.5"/>';
  },

  _svg_ring_square(c, d, l){
    return '' +
      '<rect x="25" y="25" width="90" height="90" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="50" y="50" width="40" height="40" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="25" y="25" width="90" height="10" fill="' + l + '" opacity="0.4"/>' +
      '<rect x="25" y="25" width="10" height="90" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_L_shape(c, d, l){
    return '' +
      '<path d="M25 25 L60 25 L60 90 L115 90 L115 115 L25 115 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 25 L60 25 L60 40 L40 40 L40 115 L25 115 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_T_shape(c, d, l){
    return '' +
      '<path d="M20 25 L120 25 L120 60 L85 60 L85 115 L55 115 L55 60 L20 60 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M20 25 L120 25 L120 38 L20 38 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_U_shape(c, d, l){
    return '' +
      '<path d="M25 25 L55 25 L55 85 L85 85 L85 25 L115 25 L115 115 L25 115 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 25 L55 25 L55 40 L40 40 L40 115 L25 115 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_H_shape(c, d, l){
    return '' +
      '<path d="M25 25 L55 25 L55 60 L85 60 L85 25 L115 25 L115 115 L85 115 L85 80 L55 80 L55 115 L25 115 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 25 L55 25 L55 40 L40 40 L40 115 L25 115 Z" fill="' + l + '" opacity="0.4"/>' +
      '<path d="M85 25 L115 25 L115 40 L100 40 L100 115 L85 115 Z" fill="' + d + '" opacity="0.4"/>';
  },

  _svg_I_shape(c, d, l){
    return '' +
      '<path d="M35 25 L105 25 L105 45 L80 45 L80 95 L105 95 L105 115 L35 115 L35 95 L60 95 L60 45 L35 45 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M35 25 L105 25 L105 35 L35 35 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_plus(c, d, l){
    return '' +
      '<path d="M55 25 L85 25 L85 55 L115 55 L115 85 L85 85 L85 115 L55 115 L55 85 L25 85 L25 55 L55 55 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M55 25 L85 25 L85 40 L55 40 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_minus(c, d, l){
    return '' +
      '<rect x="25" y="55" width="90" height="30" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="25" y="55" width="90" height="10" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_slash(c, d, l){
    return '' +
      '<path d="M25 115 L35 115 L115 25 L105 25 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 115 L35 115 L55 95 L45 95 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_backslash(c, d, l){
    return '' +
      '<path d="M25 25 L35 25 L115 115 L105 115 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 25 L35 25 L55 45 L45 45 Z" fill="' + l + '" opacity="0.4"/>';
  },

  /* ---------- 薄片 / 面板 ---------- */

  _svg_plate_square(c, d, l){
    return '' +
      '<path d="M70 40 L115 60 L70 80 L25 60 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 60 L70 80 L70 95 L25 75 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M115 60 L115 75 L70 95 L70 80 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_plate_rect(c, d, l){
    return '' +
      '<path d="M70 45 L125 62 L70 79 L15 62 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M15 62 L70 79 L70 92 L15 75 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M125 62 L125 75 L70 92 L70 79 Z" fill="' + d + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_plate_tri(c, d, l){
    return '' +
      '<path d="M70 40 L115 90 L25 90 Z" fill="' + l + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 90 L115 90 L115 100 L25 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  _svg_plate_hex(c, d, l){
    var pts = this._polyPts(70, 70, 42, 6, 0, 22);
    return '' +
      '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.4"/>';
  },

  _svg_plate_oct(c, d, l){
    var pts = this._polyPts(70, 70, 42, 8, Math.PI / 8, 22);
    return '' +
      '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.4"/>';
  },

  _svg_plate_circle(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.5"/>' +
      '<ellipse cx="70" cy="70" rx="30" ry="14" fill="none" stroke="#000" stroke-width="0.8" opacity="0.3"/>';
  },

  _svg_plate_ring(c, d, l){
    return '' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="22" ry="11" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="70" rx="45" ry="22" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.4"/>';
  },

  _svg_plate_star(c, d, l){
    var pts = [];
    for(var i = 0; i < 10; i++){
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var r = (i % 2 === 0) ? 45 : 20;
      pts.push((70 + Math.cos(a) * r).toFixed(1) + ',' + (70 + Math.sin(a) * r * 0.5).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>';
  },

  /* ---------- 细杆 / 管 ---------- */

  _svg_rod(c, d, l){
    return '' +
      '<rect x="55" y="20" width="30" height="100" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="20" rx="15" ry="5" fill="' + l + '" stroke="#000" stroke-width="1"/>' +
      '<ellipse cx="70" cy="120" rx="15" ry="5" fill="' + d + '" stroke="#000" stroke-width="1"/>';
  },

  _svg_rod_square(c, d, l){
    return '' +
      '<path d="M55 20 L85 20 L85 120 L55 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M55 20 L70 15 L85 20 L85 120 L70 125 L55 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M70 15 L70 125" fill="none" stroke="#000" stroke-width="0.8"/>';
  },

  _svg_rod_hex(c, d, l){
    return '' +
      '<path d="M55 20 L70 12 L85 20 L85 120 L70 128 L55 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<line x1="70" y1="12" x2="70" y2="128" stroke="#000" stroke-width="0.8" opacity="0.5"/>' +
      '<path d="M55 20 L55 120" fill="none" stroke="#000" stroke-width="1"/>';
  },

  _svg_tube(c, d, l){
    return '' +
      '<ellipse cx="70" cy="20" rx="18" ry="6" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="20" rx="9" ry="3" fill="#1f2123" stroke="#000" stroke-width="1"/>' +
      '<rect x="52" y="20" width="36" height="100" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="61" y="20" width="18" height="100" fill="#1f2123" stroke="#000" stroke-width="1"/>' +
      '<ellipse cx="70" cy="120" rx="18" ry="6" fill="' + d + '" stroke="#000" stroke-width="1.5"/>' +
      '<ellipse cx="70" cy="120" rx="9" ry="3" fill="#1f2123" stroke="#000" stroke-width="1"/>';
  },

  _svg_tube_square(c, d, l){
    return '' +
      '<path d="M52 20 L88 20 L88 120 L52 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M62 20 L78 20 L78 120 L62 120 Z" fill="#1f2123" stroke="#000" stroke-width="1"/>' +
      '<path d="M52 20 L70 12 L88 20 L88 120 L70 128 L52 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round" opacity="0.6"/>';
  },

  _svg_tube_hex(c, d, l){
    return '' +
      '<path d="M52 20 L70 12 L88 20 L88 120 L70 128 L52 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M60 20 L70 15 L80 20 L80 120 L70 125 L60 120 Z" fill="#1f2123" stroke="#000" stroke-width="1"/>';
  },

  _svg_frame(c, d, l){
    return '' +
      '<rect x="25" y="30" width="90" height="80" fill="none" stroke="' + c + '" stroke-width="10"/>' +
      '<rect x="25" y="30" width="90" height="80" fill="none" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="35" y="40" width="70" height="60" fill="none" stroke="#000" stroke-width="1" opacity="0.4"/>';
  },

  _svg_frame_square(c, d, l){
    return '' +
      '<rect x="30" y="30" width="80" height="80" fill="none" stroke="' + c + '" stroke-width="10"/>' +
      '<rect x="30" y="30" width="80" height="80" fill="none" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_frame_circle(c, d, l){
    return '' +
      '<circle cx="70" cy="70" r="40" fill="none" stroke="' + c + '" stroke-width="10"/>' +
      '<circle cx="70" cy="70" r="40" fill="none" stroke="#000" stroke-width="1.5"/>';
  },

  /* ---------- 复杂组合体 ---------- */

  _svg_gear(c, d, l){
    var path = '';
    var cx = 70, cy = 70, R = 50, r = 38, teeth = 12;
    for(var i = 0; i < teeth * 2; i++){
      var ang = -Math.PI / 2 + i * Math.PI / teeth;
      var rad = (i % 2 === 0) ? R : r;
      path += (i === 0 ? 'M' : 'L') + (cx + Math.cos(ang) * rad).toFixed(1) + ' ' + (cy + Math.sin(ang) * rad).toFixed(1) + ' ';
    }
    path += 'Z';
    return '' +
      '<path d="' + path + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="70" cy="70" r="14" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<circle cx="70" cy="70" r="38" fill="none" stroke="' + l + '" stroke-width="1" opacity="0.5"/>';
  },

  _svg_gear_thick(c, d, l){
    var path = '';
    var cx = 70, cy = 70, R = 50, r = 34, teeth = 16;
    for(var i = 0; i < teeth * 2; i++){
      var ang = -Math.PI / 2 + i * Math.PI / teeth;
      var rad = (i % 2 === 0) ? R : r;
      path += (i === 0 ? 'M' : 'L') + (cx + Math.cos(ang) * rad).toFixed(1) + ' ' + (cy + Math.sin(ang) * rad).toFixed(1) + ' ';
    }
    path += 'Z';
    return '' +
      '<path d="' + path + '" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="70" cy="70" r="18" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<circle cx="70" cy="70" r="34" fill="none" stroke="' + l + '" stroke-width="1.5" opacity="0.5"/>';
  },

  _svg_wheel(c, d, l){
    return '' +
      '<circle cx="70" cy="70" r="45" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<circle cx="70" cy="70" r="45" fill="none" stroke="' + l + '" stroke-width="2" opacity="0.5"/>' +
      '<circle cx="70" cy="70" r="15" fill="#1f2123" stroke="#000" stroke-width="1.5"/>' +
      '<circle cx="70" cy="70" r="8" fill="' + d + '" stroke="#000" stroke-width="1"/>';
  },

  _svg_wheel_spoke(c, d, l){
    return '' +
      '<circle cx="70" cy="70" r="45" fill="none" stroke="' + c + '" stroke-width="12"/>' +
      '<circle cx="70" cy="70" r="45" fill="none" stroke="#000" stroke-width="1.5"/>' +
      '<circle cx="70" cy="70" r="15" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<line x1="70" y1="25" x2="70" y2="115" stroke="#000" stroke-width="3"/>' +
      '<line x1="25" y1="70" x2="115" y2="70" stroke="#000" stroke-width="3"/>' +
      '<line x1="38" y1="38" x2="102" y2="102" stroke="#000" stroke-width="2"/>' +
      '<line x1="102" y1="38" x2="38" y2="102" stroke="#000" stroke-width="2"/>';
  },

  _svg_bar(c, d, l){
    return '' +
      '<path d="M20 55 L120 55 L120 85 L20 85 Z" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M20 55 L120 55 L120 62 L20 62 Z" fill="' + l + '" opacity="0.5"/>' +
      '<path d="M20 55 L20 85" fill="none" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_bar_curved(c, d, l){
    return '' +
      '<path d="M25 100 Q70 30 115 100" fill="none" stroke="' + c + '" stroke-width="22" stroke-linecap="round"/>' +
      '<path d="M25 100 Q70 30 115 100" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
      '<path d="M25 100 Q70 30 115 100" fill="none" stroke="' + l + '" stroke-width="3" stroke-linecap="round" opacity="0.4"/>';
  },

  _svg_beam(c, d, l){
    return '' +
      '<path d="M15 60 L125 60 L125 80 L15 80 Z" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<rect x="15" y="58" width="10" height="24" fill="' + d + '" stroke="#000" stroke-width="1"/>' +
      '<rect x="115" y="58" width="10" height="24" fill="' + d + '" stroke="#000" stroke-width="1"/>' +
      '<path d="M15 60 L125 60 L125 66 L15 66 Z" fill="' + l + '" opacity="0.5"/>';
  },

  _svg_beam_curved(c, d, l){
    return '' +
      '<path d="M20 105 Q70 25 120 105" fill="none" stroke="' + c + '" stroke-width="26" stroke-linecap="round"/>' +
      '<path d="M20 105 Q70 25 120 105" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>' +
      '<path d="M20 105 Q70 25 120 105" fill="none" stroke="' + l + '" stroke-width="3" stroke-linecap="round" opacity="0.5"/>';
  },

  _svg_panel(c, d, l){
    return '' +
      '<path d="M35 20 L105 20 L105 120 L35 120 Z" fill="' + c + '" stroke="#000" stroke-width="1.5"/>' +
      '<path d="M35 20 L105 20 L105 28 L35 28 Z" fill="' + l + '" opacity="0.5"/>' +
      '<line x1="35" y1="20" x2="105" y2="20" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_panel_curved(c, d, l){
    return '' +
      '<path d="M25 110 Q70 20 115 110 L110 110 Q70 40 30 110 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M25 110 Q70 20 115 110" fill="none" stroke="#000" stroke-width="1.5"/>';
  },

  _svg_bracket(c, d, l){
    return '' +
      '<path d="M30 30 L50 30 L50 80 L100 80 L100 100 L30 100 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M30 30 L50 30 L50 40 L40 40 L40 100 L30 100 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_bracket_L(c, d, l){
    return '' +
      '<path d="M30 30 L55 30 L55 90 L110 90 L110 110 L30 110 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M30 30 L55 30 L55 45 L45 45 L45 110 L30 110 Z" fill="' + l + '" opacity="0.4"/>';
  },

  _svg_bracket_T(c, d, l){
    return '' +
      '<path d="M20 30 L120 30 L120 50 L80 50 L80 115 L60 115 L60 50 L20 50 Z" fill="' + c + '" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M20 30 L120 30 L120 40 L20 40 Z" fill="' + l + '" opacity="0.4"/>';
  },

  /* ============================================================
   * 颜色工具
   * ============================================================ */
  _darken(hex, amt){
    var c = this._hexToRgb(hex);
    if(!c) return hex;
    return this._rgbToHex(Math.max(0, c.r * (1 - amt)), Math.max(0, c.g * (1 - amt)), Math.max(0, c.b * (1 - amt)));
  },
  _lighten(hex, amt){
    var c = this._hexToRgb(hex);
    if(!c) return hex;
    return this._rgbToHex(
      Math.min(255, c.r + (255 - c.r) * amt),
      Math.min(255, c.g + (255 - c.g) * amt),
      Math.min(255, c.b + (255 - c.b) * amt)
    );
  },
  _hexToRgb(hex){
    if(!hex) return null;
    hex = hex.replace('#', '');
    if(hex.length === 3) hex = hex.split('').map(function(x){ return x + x; }).join('');
    var num = parseInt(hex, 16);
    if(isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  },
  _rgbToHex(r, g, b){
    function h(v){ var s = Math.round(v).toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + h(r) + h(g) + h(b);
  },

  /* ============================================================
   * 生成 / 删除
   * ============================================================ */
  _spawn(item){
    if(!item) return;
    if(TBOX.Engine && TBOX.Engine.spawnProp){
      TBOX.Engine.spawnProp(item.id, {
        shapeId: item.shapeId,
        sizeId: item.sizeId,
        sizeScale: item.sizeScale,
        colorId: item.colorId,
        colorHex: item.colorHex,
        label: item.label
      });
      this._updateCount();
    }
  },

  _openCtx(x, y, item){
    if(!this.ctx || !item) return;
    var self = this;
    this.ctx.innerHTML = '';
    var items = [
      ['生成', function(){ self._spawn(item); }],
      ['复制名称', function(){ if(navigator.clipboard) navigator.clipboard.writeText(item.label); }],
      null,
      ['删除所有', function(){ if(TBOX.Engine && TBOX.Engine.clearProps) TBOX.Engine.clearProps(); self._updateCount(); }]
    ];
    items.forEach(function(it){
      if(it === null){ self.ctx.appendChild(document.createElement('hr')); return; }
      var d = document.createElement('div');
      d.textContent = it[0];
      d.addEventListener('click', function(){ it[1](); self.ctx.style.display = 'none'; });
      self.ctx.appendChild(d);
    });
    this.ctx.style.left = Math.min(x, window.innerWidth - 185) + 'px';
    this.ctx.style.top = Math.min(y, window.innerHeight - 218) + 'px';
    this.ctx.style.display = 'block';
  },

  _updateCount(){
    if(!this.countEl) return;
    var n = 0;
    if(TBOX.Engine && TBOX.Engine.props) n = TBOX.Engine.props.length;
    this.countEl.textContent = n;
  },

  open(){
    if(this.opened) return;
    this.opened = true;
    if(this.root) this.root.classList.add('open');
    if(TBOX.Engine){
      TBOX.Engine.pause();
      if(!TBOX.Engine.isTouch && TBOX.Engine.controls && TBOX.Engine.controls.isLocked){
        try { TBOX.Engine.controls.unlock(); } catch(e){}
      }
    }
    if(this.currentNode) this._buildList(this.currentNode);
    this._renderGrid();
    this._updateCount();
  },

  close(){
    if(!this.opened) return;
    this.opened = false;
    if(this.root) this.root.classList.remove('open');
    if(this.ctx) this.ctx.style.display = 'none';
    if(TBOX.Engine){
      TBOX.Engine.resume();
      if(!TBOX.Engine.isTouch && TBOX.Engine.controls){
        try { TBOX.Engine.controls.lock(); } catch(e){}
      }
    }
  },

  toggle(){
    if(this.opened) this.close(); else this.open();
  }
};

(function(){
  function boot(){
    if(window.TBOX && TBOX.SpawnMenu && document.getElementById('spawnmenu-root')){
      TBOX.SpawnMenu.init();
    } else {
      setTimeout(boot, 100);
    }
  }
  boot();
})();