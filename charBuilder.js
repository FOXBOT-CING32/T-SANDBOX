/* ============================================================
 * charBuilder.js · 角色构建公共模块（★ 完全重写 · 保守版）
 * V1.0.0
 * - 不用几何体缓存（避免 NaN 键）
 * - 不用外部尺寸引用（全部硬编码）
 * - 每个挂件独立调色
 * - 编辑器与游戏共用同一份
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.CharBuilder = {

  /* ============================================================
   * 主构建入口
   * ============================================================ */
  build(cfg){
    cfg = cfg || {};

    const root = new THREE.Group();
    root.name = 'char_root';

    /* ============================================================
     * 硬编码身体比例（保证无缝连接）
     * 世界坐标（Y 向上，0 为地面）
     * ============================================================ */
    const B = {
      head:  { cy: 1.56, w: 0.22, h: 0.22, d: 0.22 },   /* 1.45 ~ 1.67 */
      neck:  { cy: 1.42, w: 0.10, h: 0.06, d: 0.10 },   /* 1.39 ~ 1.45 */
      torso: { cy: 1.16, w: 0.32, h: 0.46, d: 0.18 },   /* 0.93 ~ 1.39 */
      hips:  { cy: 0.86, w: 0.28, h: 0.14, d: 0.18 },   /* 0.79 ~ 0.93 */
      /* 腿从 0.79 往下 */
      legGroupY: 0.79,
      thigh: { h: 0.36, w: 0.14, d: 0.15 },             /* 0.43 ~ 0.79 */
      shin:  { h: 0.42, w: 0.13, d: 0.14 },             /* 0.01 ~ 0.43 */
      foot:  { h: 0.10, w: 0.15, d: 0.28 },             /* 0.00 ~ 0.10 */
      legX: 0.08,
      /* 手臂从肩部 1.32 往下 */
      armGroupY: 1.32,
      upper: { h: 0.24, w: 0.11, d: 0.11 },             /* 1.08 ~ 1.32 */
      lower: { h: 0.20, w: 0.10, d: 0.10 },             /* 0.88 ~ 1.08 */
      hand:  { h: 0.12, w: 0.13, d: 0.13 },             /* 0.74 ~ 0.86 */
      armX: 0.22,
      armZ: 0.03
    };

    /* ============================================================
     * 材质（从 cfg 取值，全部支持颜色）
     * ============================================================ */
    const M = {
      skin:       new THREE.MeshStandardMaterial({ color: cfg.colorSkin || '#ffcda0', roughness: .75 }),
      head:       new THREE.MeshStandardMaterial({ color: cfg.colorFace || '#ffcda0', roughness: .75, transparent: true, opacity: 1.0 }),
      torso:      new THREE.MeshStandardMaterial({ color: cfg.colorTorso || '#2b3a4a', roughness: .8 }),
      hips:       new THREE.MeshStandardMaterial({ color: cfg.colorHips || '#1a1a1a', roughness: .85 }),
      armUpperL:  new THREE.MeshStandardMaterial({ color: cfg.colorArmLUpper || cfg.colorTorso || '#2b3a4a', roughness: .8 }),
      armUpperR:  new THREE.MeshStandardMaterial({ color: cfg.colorArmRUpper || cfg.colorTorso || '#2b3a4a', roughness: .8 }),
      armLowerL:  new THREE.MeshStandardMaterial({ color: cfg.colorArmLLower || '#ffcda0', roughness: .75 }),
      armLowerR:  new THREE.MeshStandardMaterial({ color: cfg.colorArmRLower || '#ffcda0', roughness: .75 }),
      handL:      new THREE.MeshStandardMaterial({ color: cfg.colorHandL || '#ffcda0', roughness: .75 }),
      handR:      new THREE.MeshStandardMaterial({ color: cfg.colorHandR || '#ffcda0', roughness: .75 }),
      legUpperL:  new THREE.MeshStandardMaterial({ color: cfg.colorLegLUpper || '#1a1a1a', roughness: .85 }),
      legUpperR:  new THREE.MeshStandardMaterial({ color: cfg.colorLegRUpper || '#1a1a1a', roughness: .85 }),
      legLowerL:  new THREE.MeshStandardMaterial({ color: cfg.colorLegLLower || '#1a1a1a', roughness: .85 }),
      legLowerR:  new THREE.MeshStandardMaterial({ color: cfg.colorLegRLower || '#1a1a1a', roughness: .85 }),
      footL:      new THREE.MeshStandardMaterial({ color: cfg.colorFootL || '#0a0a0a', roughness: .9 }),
      footR:      new THREE.MeshStandardMaterial({ color: cfg.colorFootR || '#0a0a0a', roughness: .9 })
    };

    /* ============================================================
     * 头
     * ============================================================ */
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(B.head.w, B.head.h, B.head.d),
      M.head
    );
    head.position.y = B.head.cy;
    root.add(head);

    /* ============================================================
     * 脖子
     * ============================================================ */
    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(B.neck.w, B.neck.h, B.neck.d),
      M.skin
    );
    neck.position.y = B.neck.cy;
    root.add(neck);

    /* ============================================================
     * 躯干
     * ============================================================ */
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(B.torso.w, B.torso.h, B.torso.d),
      M.torso
    );
    torso.position.y = B.torso.cy;
    root.add(torso);

    /* ============================================================
     * 胯
     * ============================================================ */
    const hips = new THREE.Mesh(
      new THREE.BoxGeometry(B.hips.w, B.hips.h, B.hips.d),
      M.hips
    );
    hips.position.y = B.hips.cy;
    root.add(hips);

    /* ============================================================
     * 手臂（左）
     * ============================================================ */
    function buildArm(side){
      const armGroup = new THREE.Group();
      armGroup.position.set(side * B.armX, B.armGroupY, B.armZ);
      armGroup.rotation.x = -0.05;
      armGroup.rotation.z = side * 0.06;

      /* 上臂 */
      const upperMat = side < 0 ? M.armUpperL : M.armUpperR;
      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(B.upper.w, B.upper.h, B.upper.d),
        upperMat
      );
      upper.position.y = -B.upper.h / 2;
      armGroup.add(upper);

      /* 前臂 group */
      const foreGroup = new THREE.Group();
      foreGroup.position.y = -B.upper.h;
      foreGroup.rotation.x = -0.05;

      const lowerMat = side < 0 ? M.armLowerL : M.armLowerR;
      const foreMesh = new THREE.Mesh(
        new THREE.BoxGeometry(B.lower.w, B.lower.h, B.lower.d),
        lowerMat
      );
      foreMesh.position.y = -B.lower.h / 2;
      foreGroup.add(foreMesh);

      /* 手 */
      const handMat = side < 0 ? M.handL : M.handR;
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(B.hand.w, B.hand.h, B.hand.d),
        handMat
      );
      hand.position.y = -B.lower.h - B.hand.h / 2;
      foreGroup.add(hand);

      armGroup.add(foreGroup);
      root.add(armGroup);

      return { group: armGroup, upper, fore: foreGroup, foreMesh, hand };
    }
    const armL = buildArm(-1);
    const armR = buildArm(1);

    /* ============================================================
     * 腿（左）
     * ============================================================ */
    function buildLeg(side){
      const legGroup = new THREE.Group();
      legGroup.position.set(side * B.legX, B.legGroupY, 0);

      /* 大腿 */
      const thighMat = side < 0 ? M.legUpperL : M.legUpperR;
      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(B.thigh.w, B.thigh.h, B.thigh.d),
        thighMat
      );
      thigh.position.y = -B.thigh.h / 2;
      legGroup.add(thigh);

      /* 小腿 group */
      const shinGroup = new THREE.Group();
      shinGroup.position.y = -B.thigh.h;

      const shinMat = side < 0 ? M.legLowerL : M.legLowerR;
      const shinMesh = new THREE.Mesh(
        new THREE.BoxGeometry(B.shin.w, B.shin.h, B.shin.d),
        shinMat
      );
      shinMesh.position.y = -B.shin.h / 2;
      shinGroup.add(shinMesh);

      /* 脚 */
      const footMat = side < 0 ? M.footL : M.footR;
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(B.foot.w, B.foot.h, B.foot.d),
        footMat
      );
      foot.position.y = -B.shin.h - B.foot.h / 2;
      foot.position.z = 0.04;
      shinGroup.add(foot);

      legGroup.add(shinGroup);
      root.add(legGroup);

      return { group: legGroup, thigh, shin: shinGroup, shinMesh, foot };
    }
    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    /* ============================================================
     * 阴影
     * ============================================================ */
    const shadowOn = TBOX.Save.get('tbox_shadow', '0') === '1';
    root.traverse(function(o){
      if(o.isMesh){
        o.castShadow = shadowOn;
        o.receiveShadow = shadowOn;
      }
    });

    /* ============================================================
     * 组装角色对象
     * ============================================================ */
    const ch = {
      root, head, neck, torso, hips,
      armL: armL.group, armR: armR.group,
      upperL: armL.upper, upperR: armR.upper,
      foreL: armL.fore, foreR: armR.fore,
      foreMeshL: armL.foreMesh, foreMeshR: armR.foreMesh,
      handL: armL.hand, handR: armR.hand,
      legL: legL.group, legR: legR.group,
      thighL: legL.thigh, thighR: legR.thigh,
      shinL: legL.shin, shinR: legR.shin,
      shinMeshL: legL.shinMesh, shinMeshR: legR.shinMesh,
      footL: legL.foot, footR: legR.foot,
      /* 兼容旧字段名 */
      fistL: armL.hand, fistR: armR.hand,
      accessories: [],
      /* 材质表（供贴图应用） */
      _mats: M,
      /* 部位映射表（供贴图应用） */
      _texMap: [
        { field: 'face',          mat: M.head,      colorKey: 'colorFace',       modeKey: 'faceMode',     mode: 'overlay' },
        { field: 'texTorso',      mat: M.torso,     colorKey: 'colorTorso',      modeKey: 'modeTorso',    mode: 'overlay' },
        { field: 'texArmL_upper', mat: M.armUpperL, colorKey: 'colorArmLUpper',  modeKey: 'modeArmLUpper',mode: 'overlay' },
        { field: 'texArmL_lower', mat: M.armLowerL, colorKey: 'colorArmLLower',  modeKey: 'modeArmLLower',mode: 'overlay' },
        { field: 'texArmR_upper', mat: M.armUpperR, colorKey: 'colorArmRUpper',  modeKey: 'modeArmRUpper',mode: 'overlay' },
        { field: 'texArmR_lower', mat: M.armLowerR, colorKey: 'colorArmRLower',  modeKey: 'modeArmRLower',mode: 'overlay' },
        { field: 'texHandL',      mat: M.handL,     colorKey: 'colorHandL',      modeKey: 'modeHandL',    mode: 'overlay' },
        { field: 'texHandR',      mat: M.handR,     colorKey: 'colorHandR',      modeKey: 'modeHandR',    mode: 'overlay' },
        { field: 'texLegL_upper', mat: M.legUpperL, colorKey: 'colorLegLUpper',  modeKey: 'modeLegLUpper',mode: 'overlay' },
        { field: 'texLegL_lower', mat: M.legLowerL, colorKey: 'colorLegLLower',  modeKey: 'modeLegLLower',mode: 'overlay' },
        { field: 'texLegR_upper', mat: M.legUpperR, colorKey: 'colorLegRUpper',  modeKey: 'modeLegRUpper',mode: 'overlay' },
        { field: 'texLegR_lower', mat: M.legLowerR, colorKey: 'colorLegRLower',  modeKey: 'modeLegRLower',mode: 'overlay' },
        { field: 'texFootL',      mat: M.footL,     colorKey: 'colorFootL',      modeKey: 'modeFootL',    mode: 'overlay' },
        { field: 'texFootR',      mat: M.footR,     colorKey: 'colorFootR',      modeKey: 'modeFootR',    mode: 'overlay' }
      ]
    };

    /* ============================================================
     * 挂件
     * ============================================================ */
    this.applyAccessories(ch, cfg);

    /* ============================================================
     * 贴图
     * ============================================================ */
    this.applyTextures(ch, cfg);

    return ch;
  },

  /* ============================================================
   * 贴图应用
   * ============================================================ */
  applyTextures(ch, cfg){
    if(!ch || !cfg || !ch._texMap) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    ch._texMap.forEach(function(item){
      const url = cfg[item.field];
      if(!url) return;

      loader.load(
        url,
        function(tex){
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          item.mat.map = tex;
          item.mat.needsUpdate = true;

          const mode = cfg[item.modeKey] || item.mode;
          if(mode === 'texture'){
            item.mat.color.set(0xffffff);
            item.mat.opacity = 1;
            item.mat.transparent = false;
          } else {
            item.mat.color.set(cfg[item.colorKey] || '#ffffff');
            item.mat.opacity = 1;
            item.mat.transparent = false;
          }
        },
        undefined,
        function(){
          console.warn('[CharBuilder] 贴图加载失败:', item.field, url);
        }
      );
    });
  },

  /* ============================================================
   * 挂件总入口
   * ============================================================ */
  applyAccessories(ch, cfg){
    if(!ch || !cfg) return;

    /* 清理旧挂件 */
    if(ch.accessories && ch.accessories.length){
      for(let i = 0; i < ch.accessories.length; i++){
        const old = ch.accessories[i];
        if(old.parent) old.parent.remove(old);
        /* dispose 材质 */
        old.traverse(function(o){
          if(o.isMesh && o.material){
            if(o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
      }
      ch.accessories = [];
    }

    const add = function(parent, obj){
      if(!obj || !parent) return;
      parent.add(obj);
      ch.accessories.push(obj);
    };

    /* 头部挂件 */
    if(cfg.hat && cfg.hat !== 'none') add(ch.head, this.buildHat(cfg));
    if(cfg.glasses && cfg.glasses !== 'none') add(ch.head, this.buildGlasses(cfg));
    if(cfg.mask && cfg.mask !== 'none') add(ch.head, this.buildMask(cfg));
    if(cfg.headphones && cfg.headphones !== 'none') add(ch.head, this.buildHeadphones(cfg));
    if(cfg.earring && cfg.earring !== 'none') add(ch.head, this.buildEarring(cfg));

    /* 躯干挂件 */
    if(cfg.necklace && cfg.necklace !== 'none') add(ch.torso, this.buildNecklace(cfg));
    if(cfg.backpack && cfg.backpack !== 'none') add(ch.torso, this.buildBackpack(cfg));
    if(cfg.cape && cfg.cape !== 'none') add(ch.torso, this.buildCape(cfg));
    if(cfg.waistbag && cfg.waistbag !== 'none') add(ch.hips, this.buildWaistbag(cfg));

    /* 手部挂件 */
    if(cfg.watch && cfg.watch !== 'none') add(ch.armL, this.buildWatch(cfg));
    if(cfg.armband && cfg.armband !== 'none') add(ch.armR, this.buildArmband(cfg));
    if(cfg.ring && cfg.ring !== 'none') add(ch.handR, this.buildRing(cfg));

    /* 腿脚挂件 */
    if(cfg.kneePad && cfg.kneePad !== 'none') add(ch.shinL, this.buildKneePad(cfg));
  },

  /* ============================================================
   * 帽子（独立调色）
   * ============================================================ */
  buildHat(cfg){
    const type = cfg.hat;
    const color = cfg.colorHat || '#1e2430';
    const g = new THREE.Group();
    g.name = 'hat_' + type;

    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .7 });

    if(type === 'cap'){
      /* 帽身 */
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.26), mat);
      body.position.y = 0.13;
      g.add(body);
      /* 帽顶 */
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.20), mat);
      top.position.y = 0.19;
      g.add(top);
      /* 帽沿 */
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.14), mat);
      brim.position.set(0, 0.08, 0.16);
      g.add(brim);
      /* 帽扣 */
      const buttonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 });
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), buttonMat);
      button.position.y = 0.21;
      g.add(button);
    } else if(type === 'helmet'){
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.30), mat);
      main.position.y = 0.14;
      g.add(main);
      /* 面罩 */
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: .2, metalness: .7, transparent: true, opacity: 0.9
      });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), visorMat);
      visor.position.set(0, 0.08, 0.155);
      g.add(visor);
      /* 侧耳 */
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), mat);
      earL.position.set(-0.16, 0.10, 0);
      g.add(earL);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), mat);
      earR.position.set(0.16, 0.10, 0);
      g.add(earR);
      /* 脊 */
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.24), mat);
      crest.position.y = 0.25;
      g.add(crest);
    } else if(type === 'crown'){
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), mat);
      base.position.y = 0.12;
      g.add(base);
      /* 3 尖 */
      const spikeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), mat);
      spikeL.position.set(-0.10, 0.21, 0);
      g.add(spikeL);
      const spikeM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.05), mat);
      spikeM.position.set(0, 0.23, 0);
      g.add(spikeM);
      const spikeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), mat);
      spikeR.position.set(0.10, 0.21, 0);
      g.add(spikeR);
      /* 宝石 */
      const gemMat = new THREE.MeshStandardMaterial({
        color: cfg.colorHatGem || 0xff3366,
        emissive: 0x661122, roughness: .15, metalness: .3
      });
      const gem1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), gemMat);
      gem1.position.set(-0.10, 0.16, 0.06);
      g.add(gem1);
      const gem2 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), gemMat);
      gem2.position.set(0, 0.14, 0.08);
      g.add(gem2);
      const gem3 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), gemMat);
      gem3.position.set(0.10, 0.16, 0.06);
      g.add(gem3);
    } else if(type === 'beanie'){
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mat);
      dome.scale.y = 0.8;
      dome.position.y = 0.15;
      g.add(dome);
      /* 绒球 */
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat);
      ball.position.y = 0.26;
      g.add(ball);
      /* 条纹 */
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 });
      for(let i = 0; i < 3; i++){
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 12, 8), stripeMat);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.y = 0.08 + i * 0.05;
        g.add(stripe);
      }
    } else {
      return null;
    }

    g.position.y = 0;
    return g;
  },

  /* ============================================================
   * 眼镜（独立调色）
   * ============================================================ */
  buildGlasses(cfg){
    const type = cfg.glasses;
    const frameColor = cfg.colorGlassesFrame || '#222222';
    const lensColor = cfg.colorGlassesLens || (type === 'sun' ? '#000000' : '#ffffff');
    const g = new THREE.Group();
    g.name = 'glasses_' + type;

    const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: .3, metalness: .8 });

    if(type === 'sun'){
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColor, roughness: .15, metalness: .9, transparent: true, opacity: 0.92
      });
      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), lensMat);
      lensL.position.set(-0.065, 0.02, 0.13);
      g.add(lensL);
      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), lensMat);
      lensR.position.set(0.065, 0.02, 0.13);
      g.add(lensR);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), frameMat);
      bridge.position.set(0, 0.03, 0.13);
      g.add(bridge);
      const templeL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      templeL.position.set(-0.11, 0.02, 0.07);
      g.add(templeL);
      const templeR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      templeR.position.set(0.11, 0.02, 0.07);
      g.add(templeR);
    } else if(type === 'round'){
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColor, roughness: .05, transparent: true, opacity: 0.35
      });
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 16, 12), frameMat);
      ringL.position.set(-0.06, 0.02, 0.13);
      g.add(ringL);
      const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 16, 12), frameMat);
      ringR.position.set(0.06, 0.02, 0.13);
      g.add(ringR);
      const glassL = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.005, 16), lensMat);
      glassL.rotation.x = Math.PI / 2;
      glassL.position.set(-0.06, 0.02, 0.13);
      g.add(glassL);
      const glassR = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.005, 16), lensMat);
      glassR.rotation.x = Math.PI / 2;
      glassR.position.set(0.06, 0.02, 0.13);
      g.add(glassR);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), frameMat);
      bridge.position.set(0, 0.03, 0.13);
      g.add(bridge);
    } else {
      /* 普通 */
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColor, roughness: .05, transparent: true, opacity: 0.2
      });
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), frameMat);
      frameL.position.set(-0.06, 0.02, 0.13);
      g.add(frameL);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), frameMat);
      frameR.position.set(0.06, 0.02, 0.13);
      g.add(frameR);
      const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.008), lensMat);
      glassL.position.set(-0.06, 0.02, 0.135);
      g.add(glassL);
      const glassR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.008), lensMat);
      glassR.position.set(0.06, 0.02, 0.135);
      g.add(glassR);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), frameMat);
      bridge.position.set(0, 0.03, 0.13);
      g.add(bridge);
      /* 鼻托 */
      const noseL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), frameMat);
      noseL.position.set(-0.02, 0.0, 0.13);
      g.add(noseL);
      const noseR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), frameMat);
      noseR.position.set(0.02, 0.0, 0.13);
      g.add(noseR);
      /* 镜腿 */
      const templeL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      templeL.position.set(-0.11, 0.02, 0.07);
      g.add(templeL);
      const templeR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      templeR.position.set(0.11, 0.02, 0.07);
      g.add(templeR);
    }

    return g;
  },

  /* ============================================================
   * 口罩（独立调色）
   * ============================================================ */
  buildMask(cfg){
    const type = cfg.mask;
    const color = cfg.colorMask || (type === 'n95' ? '#ffffff' : (type === 'bandana' ? '#444444' : '#a0d8ff'));
    const g = new THREE.Group();
    g.name = 'mask_' + type;

    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .85 });
    const earMat = new THREE.MeshStandardMaterial({ color: cfg.colorMaskEar || '#dddddd', roughness: .9 });

    if(type === 'n95'){
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.07), mat);
      main.position.set(0, -0.04, 0.135);
      g.add(main);
      const valve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: .7, roughness: .3 })
      );
      valve.rotation.x = Math.PI / 2;
      valve.position.set(0, -0.02, 0.175);
      g.add(valve);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.08), earMat);
      earL.position.set(-0.11, -0.02, 0.05);
      g.add(earL);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.08), earMat);
      earR.position.set(0.11, -0.02, 0.05);
      g.add(earR);
    } else if(type === 'bandana'){
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.05), mat);
      main.position.set(0, -0.06, 0.135);
      g.add(main);
      const foldMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .95 });
      for(let i = 0; i < 2; i++){
        const fold = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.005, 0.05), foldMat);
        fold.position.set(0, -0.02 - i * 0.08, 0.14);
        g.add(fold);
      }
    } else {
      /* 医用 */
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.03), mat);
      main.position.set(0, -0.04, 0.135);
      g.add(main);
      const creaseMat = new THREE.MeshStandardMaterial({ color: 0x88b8d8, roughness: .85 });
      for(let i = 0; i < 3; i++){
        const crease = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.008, 0.032), creaseMat);
        crease.position.set(0, -0.01 - i * 0.035, 0.136);
        g.add(crease);
      }
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.10), earMat);
      earL.position.set(-0.11, -0.02, 0.05);
      g.add(earL);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.10), earMat);
      earR.position.set(0.11, -0.02, 0.05);
      g.add(earR);
    }

    return g;
  },

  /* ============================================================
   * 耳机（独立调色）
   * ============================================================ */
  buildHeadphones(cfg){
    const color = cfg.colorHeadphones || '#1a1a1a';
    const lightColor = cfg.colorHeadphonesLight || '#4fd1ff';
    const g = new THREE.Group();
    g.name = 'headphones';

    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .55, metalness: .3 });

    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), mat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.14, 0.02, 0);
    g.add(earL);

    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), mat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(0.14, 0.02, 0);
    g.add(earR);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 12, 8), mat);
    band.rotation.y = Math.PI / 2;
    band.position.y = 0.15;
    g.add(band);

    const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), mat);
    mic.rotation.z = Math.PI / 3;
    mic.position.set(-0.14, -0.08, 0.06);
    g.add(mic);

    const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mat);
    micTip.position.set(-0.18, -0.14, 0.06);
    g.add(micTip);

    /* 指示灯 */
    const lightMat = new THREE.MeshStandardMaterial({
      color: lightColor, emissive: lightColor, emissiveIntensity: 1
    });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), lightMat);
    light.position.set(0.14, 0.06, 0.04);
    g.add(light);

    return g;
  },

  /* ============================================================
   * 耳环（独立调色）
   * ============================================================ */
  buildEarring(cfg){
    const color = cfg.colorEarring || '#ffcc33';
    const g = new THREE.Group();
    g.name = 'earring';

    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .3, metalness: .9 });

    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 6), mat);
    hoop.position.set(-0.13, -0.02, 0);
    g.add(hoop);

    const hoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 6), mat);
    hoop2.position.set(0.13, -0.02, 0);
    g.add(hoop2);

    return g;
  },

  /* ============================================================
   * 项链（独立调色）
   * ============================================================ */
  buildNecklace(cfg){
    const type = cfg.necklace;
    const chainColor = cfg.colorNecklace || '#ffcc33';
    const gemColor = cfg.colorNecklaceGem || '#4fd1ff';
    const g = new THREE.Group();
    g.name = 'necklace_' + type;

    const chainMat = new THREE.MeshStandardMaterial({ color: chainColor, roughness: .2, metalness: .95 });

    if(type === 'chain' || type === 'pendant'){
      /* 6 球串链 */
      for(let i = 0; i < 6; i++){
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), chainMat);
        const angle = -0.6 + i * 0.24;
        ball.position.set(
          Math.sin(angle) * 0.10,
          0.20 - Math.cos(angle) * 0.04 + 0.04,
          0.11
        );
        g.add(ball);
      }

      if(type === 'pendant'){
        const pendMat = new THREE.MeshStandardMaterial({
          color: gemColor, emissive: 0x224466, roughness: .15, metalness: .3
        });
        const pend = new THREE.Mesh(new THREE.SphereGeometry(0.030, 12, 8), pendMat);
        pend.position.set(0, 0.11, 0.12);
        g.add(pend);
        /* 支架 */
        for(let k = 0; k < 4; k++){
          const a = k * Math.PI / 2 + Math.PI / 4;
          const strut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.03), chainMat);
          strut.position.set(Math.cos(a) * 0.03, 0.11, 0.12);
          g.add(strut);
        }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 8, 6), chainMat);
        ring.position.set(0, 0.135, 0.12);
        g.add(ring);
      }
    } else if(type === 'choker'){
      const chokerMat = new THREE.MeshStandardMaterial({ color: cfg.colorChoker || '#222222', roughness: .85 });
      const choker = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 16, 12), chokerMat);
      choker.rotation.x = Math.PI / 2;
      choker.position.y = 0.18;
      g.add(choker);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.012), chainMat);
      buckle.position.set(0, 0.18, 0.14);
      g.add(buckle);
      /* 铆钉 */
      for(let s = 0; s < 6; s++){
        const ang = s * Math.PI / 3;
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), chainMat);
        stud.position.set(Math.cos(ang) * 0.13, 0.18, Math.sin(ang) * 0.13);
        g.add(stud);
      }
      /* 环 */
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 8, 6), chainMat);
      loop.position.set(0, 0.14, 0.14);
      g.add(loop);
    }

    return g;
  },

  /* ============================================================
   * 手表（独立调色）
   * ============================================================ */
  buildWatch(cfg){
    const strapColor = cfg.colorWatchStrap || '#111111';
    const caseColor = cfg.colorWatchCase || '#aaaaaa';
    const g = new THREE.Group();
    g.name = 'watch';

    const strapMat = new THREE.MeshStandardMaterial({ color: strapColor, roughness: .5 });
    const caseMat = new THREE.MeshStandardMaterial({ color: caseColor, roughness: .25, metalness: .9 });

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 16, 8), strapMat);
    strap.rotation.x = Math.PI / 2;
    g.add(strap);

    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.014, 16), caseMat);
    face.rotation.x = Math.PI / 2;
    face.position.z = 0.05;
    g.add(face);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.002, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: 0.4 })
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.z = 0.058;
    g.add(glass);

    /* 指针 */
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.002, 0.002),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    hand.position.z = 0.06;
    g.add(hand);
    const hand2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.002, 0.002),
      new THREE.MeshStandardMaterial({ color: 0xff3b5c })
    );
    hand2.rotation.z = Math.PI / 2;
    hand2.position.z = 0.06;
    g.add(hand2);

    /* 表冠 */
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), caseMat);
    crown.rotation.z = Math.PI / 2;
    crown.position.set(0.032, 0, 0.05);
    g.add(crown);

    /* 定位到左手腕 */
    g.position.set(-0.13, -0.11, 0.02);
    return g;
  },

  /* ============================================================
   * 腕带（独立调色）
   * ============================================================ */
  buildArmband(cfg){
    const color = cfg.colorArmband || '#aa2222';
    const badgeColor = cfg.colorArmbandBadge || '#ffcc33';
    const g = new THREE.Group();
    g.name = 'armband';

    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .9 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.010, 16, 8), mat);
    band.rotation.x = Math.PI / 2;
    g.add(band);

    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.005, 12),
      new THREE.MeshStandardMaterial({ color: badgeColor, roughness: .3, metalness: .8 })
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.z = 0.055;
    g.add(badge);

    g.position.set(0.13, -0.11, 0.02);
    return g;
  },

  /* ============================================================
   * 戒指（独立调色）
   * ============================================================ */
  buildRing(cfg){
    const color = cfg.colorRing || '#ffcc33';
    const gemColor = cfg.colorRingGem || '#4fd1ff';
    const g = new THREE.Group();
    g.name = 'ring';

    const ringMat = new THREE.MeshStandardMaterial({ color: color, roughness: .2, metalness: .95 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 6), ringMat);
    g.add(ring);

    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.010, 8, 6),
      new THREE.MeshStandardMaterial({ color: gemColor, emissive: 0x224466, roughness: .15 })
    );
    gem.position.set(0, 0.020, 0);
    g.add(gem);

    g.position.set(0, 0.04, 0);
    return g;
  },

  /* ============================================================
   * 背包（独立调色）
   * ============================================================ */
  buildBackpack(cfg){
    const type = cfg.backpack;
    const color = cfg.colorBackpack || '#3a2a1a';
    const g = new THREE.Group();
    g.name = 'backpack_' + type;

    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .9 });
    const strapMat = new THREE.MeshStandardMaterial({ color: cfg.colorBackpackStrap || '#111111', roughness: .9 });
    const zipMat = new THREE.MeshStandardMaterial({ color: cfg.colorBackpackZip || '#aaaaaa', roughness: .3, metalness: .8 });

    const size = (type === 'large') ? { w: 0.26, h: 0.32, d: 0.12 } : { w: 0.20, h: 0.24, d: 0.10 };

    const main = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d), m);
    main.position.set(0, 0, -0.14);
    g.add(main);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.06, size.d), m);
    lid.position.set(0, size.h / 2 - 0.03, -0.14);
    g.add(lid);

    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.03, size.h * 0.85, 0.02), strapMat);
    strapL.position.set(-0.07, 0, -0.08);
    g.add(strapL);
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.03, size.h * 0.85, 0.02), strapMat);
    strapR.position.set(0.07, 0, -0.08);
    g.add(strapR);

    const zipper = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.8, 0.008, 0.008), zipMat);
    zipper.position.set(0, 0, -0.20);
    g.add(zipper);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.35, size.h * 0.25, 0.03), m);
    pocket.position.set(-size.w / 2 - 0.015, -size.h * 0.2, -0.14);
    g.add(pocket);
    const pocket2 = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.35, size.h * 0.25, 0.03), m);
    pocket2.position.set(size.w / 2 + 0.015, -size.h * 0.2, -0.14);
    g.add(pocket2);

    return g;
  },

  /* ============================================================
   * 披风（独立调色）
   * ============================================================ */
  buildCape(cfg){
    const color = cfg.colorCape || '#1a1a1a';
    const collarColor = cfg.colorCapeCollar || '#000000';
    const g = new THREE.Group();
    g.name = 'cape';

    const m = new THREE.MeshStandardMaterial({
      color: color, roughness: .9, side: THREE.DoubleSide
    });

    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.70, 0.02), m);
    cape.position.set(0, -0.20, -0.14);
    g.add(cape);

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color: collarColor, roughness: .7 })
    );
    collar.position.set(0, 0.16, -0.10);
    g.add(collar);

    return g;
  },

  /* ============================================================
   * 腰包（独立调色）
   * ============================================================ */
  buildWaistbag(cfg){
    const color = cfg.colorWaistbag || '#3a2a1a';
    const zipColor = cfg.colorWaistbagZip || '#aaaaaa';
    const g = new THREE.Group();
    g.name = 'waistbag';

    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .9 });

    const main = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.06), m);
    main.position.set(0, 0, 0.11);
    g.add(main);

    const zipper = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.008, 0.008),
      new THREE.MeshStandardMaterial({ color: zipColor, roughness: .3, metalness: .8 })
    );
    zipper.position.set(0, 0.03, 0.14);
    g.add(zipper);

    return g;
  },

  /* ============================================================
   * 护膝（独立调色）
   * ============================================================ */
  buildKneePad(cfg){
    const color = cfg.colorKneePad || '#111111';
    const g = new THREE.Group();
    g.name = 'kneepad';

    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .6 });

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.16), m);
    pad.position.set(0, -0.20, 0.02);
    g.add(pad);

    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .9 }));
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, -0.26, 0);
    g.add(strap);

    return g;
  }
};