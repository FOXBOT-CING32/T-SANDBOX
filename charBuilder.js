/* ============================================================
 * charBuilder.js · 角色构建公共模块
 * V3.2.0 · 第二批：TBOX.Save 兜底
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.CharBuilder = {

  _getShadowSetting(){
    try {
      if(TBOX.Save && typeof TBOX.Save.get === 'function'){
        return TBOX.Save.get('tbox_shadow', '0') === '1';
      }
    } catch(e){}
    return false;
  },

  build(cfg){
    cfg = cfg || {};

    const root = new THREE.Group();
    root.name = 'char_root';
    root.position.y = 0.02;

    const ARM_SHOULDER_Y = 1.36;

    const B = {
      head:  { cy: 1.56, w: 0.22, h: 0.22, d: 0.22 },
      neck:  { cy: 1.42, w: 0.10, h: 0.06, d: 0.10 },
      torso: { cy: 1.16, w: 0.32, h: 0.46, d: 0.18 },
      hips:  { cy: 0.86, w: 0.28, h: 0.14, d: 0.18 },
      legGroupY: 0.79,
      thigh: { h: 0.36, w: 0.14, d: 0.15 },
      shin:  { h: 0.42, w: 0.13, d: 0.14 },
      foot:  { h: 0.10, w: 0.15, d: 0.28 },
      legX: 0.08,
      armGroupY: ARM_SHOULDER_Y,
      upper: { h: 0.24, w: 0.11, d: 0.11 },
      lower: { h: 0.20, w: 0.10, d: 0.10 },
      hand:  { h: 0.12, w: 0.13, d: 0.13 },
      armX: 0.22,
      armZ: 0.03
    };

    const headMats = [
      new THREE.MeshStandardMaterial({ color: cfg.colorFaceSide || cfg.colorFace || '#ffcda0', roughness: .75 }),
      new THREE.MeshStandardMaterial({ color: cfg.colorFaceSide || cfg.colorFace || '#ffcda0', roughness: .75 }),
      new THREE.MeshStandardMaterial({ color: cfg.colorFaceTop  || cfg.colorFace || '#ffcda0', roughness: .75 }),
      new THREE.MeshStandardMaterial({ color: cfg.colorFaceBottom || cfg.colorFace || '#ffcda0', roughness: .75 }),
      new THREE.MeshStandardMaterial({ color: cfg.colorFace     || '#ffcda0', roughness: .75, transparent: true, opacity: 1.0 }),
      new THREE.MeshStandardMaterial({ color: cfg.colorFaceBack || cfg.colorFace || '#ffcda0', roughness: .75 })
    ];

    const M = {
      skin:       new THREE.MeshStandardMaterial({ color: cfg.colorSkin || '#ffcda0', roughness: .75 }),
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

    const head = new THREE.Mesh(new THREE.BoxGeometry(B.head.w, B.head.h, B.head.d), headMats);
    head.position.y = B.head.cy;
    root.add(head);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(B.neck.w, B.neck.h, B.neck.d), M.skin);
    neck.position.y = B.neck.cy;
    root.add(neck);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(B.torso.w, B.torso.h, B.torso.d), M.torso);
    torso.position.y = B.torso.cy;
    root.add(torso);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(B.hips.w, B.hips.h, B.hips.d), M.hips);
    hips.position.y = B.hips.cy;
    root.add(hips);

    function buildArm(side){
      const armGroup = new THREE.Group();
      armGroup.position.set(side * B.armX, B.armGroupY, B.armZ);
      armGroup.rotation.x = -0.05;
      armGroup.rotation.z = side * 0.06;

      const upperMat = side < 0 ? M.armUpperL : M.armUpperR;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(B.upper.w, B.upper.h, B.upper.d), upperMat);
      upper.position.y = -B.upper.h / 2;
      armGroup.add(upper);

      const foreGroup = new THREE.Group();
      foreGroup.position.y = -B.upper.h;
      foreGroup.rotation.x = -0.05;

      const lowerMat = side < 0 ? M.armLowerL : M.armLowerR;
      const foreMesh = new THREE.Mesh(new THREE.BoxGeometry(B.lower.w, B.lower.h, B.lower.d), lowerMat);
      foreMesh.position.y = -B.lower.h / 2;
      foreGroup.add(foreMesh);

      const handMat = side < 0 ? M.handL : M.handR;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(B.hand.w, B.hand.h, B.hand.d), handMat);
      hand.position.y = -B.lower.h - B.hand.h / 2;
      foreGroup.add(hand);

      armGroup.add(foreGroup);
      root.add(armGroup);

      return { group: armGroup, upper, fore: foreGroup, foreMesh, hand };
    }
    const armL = buildArm(-1);
    const armR = buildArm(1);

    function buildLeg(side){
      const legGroup = new THREE.Group();
      legGroup.position.set(side * B.legX, B.legGroupY, 0);

      const thighMat = side < 0 ? M.legUpperL : M.legUpperR;
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(B.thigh.w, B.thigh.h, B.thigh.d), thighMat);
      thigh.position.y = -B.thigh.h / 2;
      legGroup.add(thigh);

      const shinGroup = new THREE.Group();
      shinGroup.position.y = -B.thigh.h;

      const shinMat = side < 0 ? M.legLowerL : M.legLowerR;
      const shinMesh = new THREE.Mesh(new THREE.BoxGeometry(B.shin.w, B.shin.h, B.shin.d), shinMat);
      shinMesh.position.y = -B.shin.h / 2;
      shinGroup.add(shinMesh);

      const footMat = side < 0 ? M.footL : M.footR;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(B.foot.w, B.foot.h, B.foot.d), footMat);
      foot.position.y = -B.shin.h + B.foot.h / 2;
      foot.position.z = 0.04;
      shinGroup.add(foot);

      legGroup.add(shinGroup);
      root.add(legGroup);

      return { group: legGroup, thigh, shin: shinGroup, shinMesh, foot };
    }
    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    /* ★ TBOX.Save 兜底 */
    const shadowOn = this._getShadowSetting();
    root.traverse(function(o){
      if(o.isMesh){
        o.castShadow = shadowOn;
        o.receiveShadow = shadowOn;
      }
    });

    const ch = {
      root, head, neck, torso, hips,
      armL: armL.group, armR: armR.group,
      upperL: armL.upper, upperR: armR.upper,
      foreL: armL.fore, foreR: armR.fore,
      foreMeshL: armL.foreMesh, foreMeshR: armR.foreMesh,
      handL: armL.hand, handR: armR.hand,
      fistL: armL.hand, fistR: armR.hand,
      legL: legL.group, legR: legR.group,
      thighL: legL.thigh, thighR: legR.thigh,
      shinL: legL.shin, shinR: legR.shin,
      shinMeshL: legL.shinMesh, shinMeshR: legR.shinMesh,
      footL: legL.foot, footR: legR.foot,
      accessories: [],
      _mats: M,
      _headMats: headMats,
      _texMap: [
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
      ],
      _capeMesh: null
    };

    this.applyAccessories(ch, cfg);
    this.applyTextures(ch, cfg);
    this.applyHeadTextures(ch, cfg);

    return ch;
  },

  applyHeadTextures(ch, cfg){
    if(!ch || !ch._headMats) return;
    const mats = ch._headMats;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const mode = cfg.headWrap || 'front';

    const loadTo = function(mat, url, color){
      if(!url){
        mat.map = null;
        mat.color.set(color || '#ffcda0');
        mat.needsUpdate = true;
        return;
      }
      loader.load(url, function(tex){
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.color.set(color || 0xffffff);
        mat.needsUpdate = true;
      }, undefined, function(){
        console.warn('[CharBuilder] 头部贴图加载失败:', url);
      });
    };

    const face = cfg.face || '';
    const faceColor = cfg.colorFace || '#ffcda0';
    const faceBack = cfg.faceBack || face;
    const faceLeft = cfg.faceLeft || face;
    const faceRight = cfg.faceRight || face;
    const faceTop = cfg.faceTop || face;
    const faceBottom = cfg.faceBottom || face;

    if(mode === 'full'){
      loadTo(mats[0], faceRight, faceColor);
      loadTo(mats[1], faceLeft, faceColor);
      loadTo(mats[2], faceTop, faceColor);
      loadTo(mats[3], faceBottom, faceColor);
      loadTo(mats[4], face, faceColor);
      loadTo(mats[5], faceBack, faceColor);
    } else if(mode === 'half'){
      loadTo(mats[0], faceRight, faceColor);
      loadTo(mats[1], faceLeft, faceColor);
      loadTo(mats[2], faceTop, faceColor);
      loadTo(mats[3], '', faceColor);
      loadTo(mats[4], face, faceColor);
      loadTo(mats[5], '', faceColor);
    } else if(mode === 'six'){
      loadTo(mats[0], cfg.faceRight || '', cfg.colorFaceRight || faceColor);
      loadTo(mats[1], cfg.faceLeft  || '', cfg.colorFaceLeft  || faceColor);
      loadTo(mats[2], cfg.faceTop   || '', cfg.colorFaceTop   || faceColor);
      loadTo(mats[3], cfg.faceBottom|| '', cfg.colorFaceBottom|| faceColor);
      loadTo(mats[4], face, faceColor);
      loadTo(mats[5], cfg.faceBack  || '', cfg.colorFaceBack  || faceColor);
    } else {
      loadTo(mats[0], '', faceColor);
      loadTo(mats[1], '', faceColor);
      loadTo(mats[2], '', faceColor);
      loadTo(mats[3], '', faceColor);
      loadTo(mats[4], face, faceColor);
      loadTo(mats[5], '', faceColor);
    }
  },

  applyTextures(ch, cfg){
    if(!ch || !cfg || !ch._texMap) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    ch._texMap.forEach(function(item){
      const url = cfg[item.field];
      if(!url) return;
      loader.load(url, function(tex){
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        item.mat.map = tex;
        item.mat.needsUpdate = true;
        const mode = cfg[item.modeKey] || item.mode;
        if(mode === 'texture'){
          item.mat.color.set(0xffffff);
        } else {
          item.mat.color.set(cfg[item.colorKey] || '#ffffff');
        }
        item.mat.opacity = 1;
        item.mat.transparent = false;
      }, undefined, function(){
        console.warn('[CharBuilder] 贴图加载失败:', item.field, url);
      });
    });
  },

  applyAccessories(ch, cfg){
    if(!ch || !cfg) return;

    if(ch.accessories && ch.accessories.length){
      for(let i = 0; i < ch.accessories.length; i++){
        const old = ch.accessories[i];
        if(old.parent) old.parent.remove(old);
        old.traverse(function(o){
          if(o.isMesh && o.material){
            if(Array.isArray(o.material)){
              o.material.forEach(function(m){ if(m.map) m.map.dispose(); m.dispose(); });
            } else {
              if(o.material.map) o.material.map.dispose();
              o.material.dispose();
            }
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

    if(cfg.hat && cfg.hat !== 'none') add(ch.head, this.buildHat(cfg));
    if(cfg.glasses && cfg.glasses !== 'none') add(ch.head, this.buildGlasses(cfg));

    if(cfg.back && cfg.back !== 'none'){
      if(cfg.back === 'bag_small' || cfg.back === 'bag_large'){
        add(ch.torso, this.buildBackpack(cfg, cfg.back));
      } else if(cfg.back === 'cape'){
        const cape = this.buildCape(cfg);
        if(cape){
          ch.torso.add(cape);
          ch._capeMesh = cape;
        }
      }
    }

    if(cfg.kneePad && cfg.kneePad !== 'none'){
      add(ch.thighL, this.buildKneePad(cfg, -1));
      add(ch.thighR, this.buildKneePad(cfg, 1));
    }
    if(cfg.elbowPadLeft && cfg.elbowPadLeft !== 'none'){
      add(ch.upperL, this.buildElbowPad(cfg, -1));
    }
    if(cfg.elbowPadRight && cfg.elbowPadRight !== 'none'){
      add(ch.upperR, this.buildElbowPad(cfg, 1));
    }
  },

  buildHat(cfg){
    const type = cfg.hat;
    const color = cfg.colorHat || '#1e2430';
    const g = new THREE.Group();
    g.name = 'hat_' + type;
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: .7 });

    if(type === 'cap'){
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.26), mat);
      body.position.y = 0.13; g.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.20), mat);
      top.position.y = 0.19; g.add(top);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.14), mat);
      brim.position.set(0, 0.08, 0.16); g.add(brim);
      const btnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 });
      const button = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), btnMat);
      button.position.y = 0.21; g.add(button);
    } else if(type === 'helmet'){
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.30), mat);
      main.position.y = 0.14; g.add(main);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: .2, metalness: .7, transparent: true, opacity: 0.9
      });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), visorMat);
      visor.position.set(0, 0.08, 0.155); g.add(visor);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), mat);
      earL.position.set(-0.16, 0.10, 0); g.add(earL);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.12), mat);
      earR.position.set(0.16, 0.10, 0); g.add(earR);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.24), mat);
      crest.position.y = 0.25; g.add(crest);
    } else if(type === 'crown'){
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), mat);
      base.position.y = 0.12; g.add(base);
      const spikeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), mat);
      spikeL.position.set(-0.10, 0.21, 0); g.add(spikeL);
      const spikeM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.05), mat);
      spikeM.position.set(0, 0.23, 0); g.add(spikeM);
      const spikeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), mat);
      spikeR.position.set(0.10, 0.21, 0); g.add(spikeR);
      const gemMat = new THREE.MeshStandardMaterial({
        color: cfg.colorHatGem || 0xff3366, emissive: 0x661122, roughness: .15, metalness: .3
      });
      const gem1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), gemMat);
      gem1.position.set(-0.10, 0.16, 0.06); g.add(gem1);
      const gem2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), gemMat);
      gem2.position.set(0, 0.14, 0.08); g.add(gem2);
      const gem3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), gemMat);
      gem3.position.set(0.10, 0.16, 0.06); g.add(gem3);
    } else if(type === 'beanie'){
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.26), mat);
      dome.position.y = 0.12; g.add(dome);
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.18), mat);
      topCap.position.y = 0.21; g.add(topCap);
      const ball = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), mat);
      ball.position.y = 0.27; g.add(ball);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 });
      for(let i = 0; i < 2; i++){
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.02, 0.27), stripeMat);
        stripe.position.y = 0.06 + i * 0.06; g.add(stripe);
      }
    } else return null;
    return g;
  },

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
      lensL.position.set(-0.065, 0.02, 0.13); g.add(lensL);
      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), lensMat);
      lensR.position.set(0.065, 0.02, 0.13); g.add(lensR);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), frameMat);
      bridge.position.set(0, 0.03, 0.13); g.add(bridge);
      const tL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tL.position.set(-0.11, 0.02, 0.07); g.add(tL);
      const tR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tR.position.set(0.11, 0.02, 0.07); g.add(tR);
    } else if(type === 'round'){
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColor, roughness: .05, transparent: true, opacity: 0.35
      });
      const fw = 0.09, fh = 0.09, th = 0.010;
      const parts = [
        [-0.06, 0.02 + fh/2 - th/2, fw, th],
        [-0.06, 0.02 - fh/2 + th/2, fw, th],
        [-0.06 - fw/2 + th/2, 0.02, th, fh - th*2],
        [-0.06 + fw/2 - th/2, 0.02, th, fh - th*2],
        [0.06, 0.02 + fh/2 - th/2, fw, th],
        [0.06, 0.02 - fh/2 + th/2, fw, th],
        [0.06 - fw/2 + th/2, 0.02, th, fh - th*2],
        [0.06 + fw/2 - th/2, 0.02, th, fh - th*2]
      ];
      parts.forEach(function(p){
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(p[2], p[3], th), frameMat);
        mesh.position.set(p[0], p[1], 0.13);
        g.add(mesh);
      });
      const gl = new THREE.Mesh(new THREE.BoxGeometry(fw - th*2, fh - th*2, 0.005), lensMat);
      gl.position.set(-0.06, 0.02, 0.13); g.add(gl);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(fw - th*2, fh - th*2, 0.005), lensMat);
      gr.position.set(0.06, 0.02, 0.13); g.add(gr);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.01), frameMat);
      bridge.position.set(0, 0.03, 0.13); g.add(bridge);
      const tL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tL.position.set(-0.12, 0.02, 0.07); g.add(tL);
      const tR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tR.position.set(0.12, 0.02, 0.07); g.add(tR);
    } else {
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColor, roughness: .05, transparent: true, opacity: 0.2
      });
      const fL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), frameMat);
      fL.position.set(-0.06, 0.02, 0.13); g.add(fL);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.015), frameMat);
      fR.position.set(0.06, 0.02, 0.13); g.add(fR);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.008), lensMat);
      gl.position.set(-0.06, 0.02, 0.135); g.add(gl);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.008), lensMat);
      gr.position.set(0.06, 0.02, 0.135); g.add(gr);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), frameMat);
      bridge.position.set(0, 0.03, 0.13); g.add(bridge);
      const noseL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), frameMat);
      noseL.position.set(-0.02, 0.0, 0.13); g.add(noseL);
      const noseR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.008), frameMat);
      noseR.position.set(0.02, 0.0, 0.13); g.add(noseR);
      const tL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tL.position.set(-0.11, 0.02, 0.07); g.add(tL);
      const tR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), frameMat);
      tR.position.set(0.11, 0.02, 0.07); g.add(tR);
    }
    return g;
  },

  buildBackpack(cfg, type){
    const color = cfg.colorBackpack || '#3a2a1a';
    const g = new THREE.Group();
    g.name = 'backpack_' + type;
    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .9 });
    const strapMat = new THREE.MeshStandardMaterial({ color: cfg.colorBackpackStrap || '#111111', roughness: .9 });
    const zipMat = new THREE.MeshStandardMaterial({ color: cfg.colorBackpackZip || '#aaaaaa', roughness: .3, metalness: .8 });

    const size = (type === 'bag_large') ? { w: 0.26, h: 0.32, d: 0.12 } : { w: 0.20, h: 0.24, d: 0.10 };
    const main = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d), m);
    main.position.set(0, 0, -0.16); g.add(main);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.06, size.d), m);
    lid.position.set(0, size.h / 2 - 0.03, -0.16); g.add(lid);
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.03, size.h * 0.85, 0.02), strapMat);
    strapL.position.set(-0.07, 0, -0.10); g.add(strapL);
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.03, size.h * 0.85, 0.02), strapMat);
    strapR.position.set(0.07, 0, -0.10); g.add(strapR);
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.8, 0.008, 0.008), zipMat);
    zipper.position.set(0, 0, -0.22); g.add(zipper);
    return g;
  },

  buildCape(cfg){
    const color = cfg.colorCape || '#1a1a1a';
    const g = new THREE.Group();
    g.name = 'cape';

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: cfg.colorCapeCollar || '#000000', roughness: .7 })
    );
    collar.position.set(0, 0.24, -0.09);
    g.add(collar);

    const CAPE_W = 0.32;
    const CAPE_H = 0.70;
    const CAPE_Z = -0.09;

    const mat = new THREE.MeshStandardMaterial({
      color: color, roughness: .9, side: THREE.DoubleSide
    });

    if(cfg.capeImage){
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(cfg.capeImage, function(tex){
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      }, undefined, function(){
        console.warn('[CharBuilder] 披风图片加载失败');
      });
    }

    const COLS = 4;
    const ROWS = 10;
    const geo = new THREE.PlaneGeometry(CAPE_W, CAPE_H, COLS - 1, ROWS - 1);
    const cape = new THREE.Mesh(geo, mat);
    cape.name = 'cape_solid';
    cape.position.set(0, 0.22 - CAPE_H / 2, CAPE_Z);
    g.add(cape);

    g.userData.capeMesh = cape;
    g.userData.geo = geo;
    g.userData.CAPE_W = CAPE_W;
    g.userData.CAPE_H = CAPE_H;
    g.userData.COLS = COLS;
    g.userData.ROWS = ROWS;
    g.userData.origPositions = new Float32Array(geo.attributes.position.array);
    g.userData.frameSkip = 0;
    g.userData.mode = 'solid';
    geo.computeVertexNormals();

    g.userData.time = 0;
    return g;
  },

  buildKneePad(cfg, side){
    const color = cfg.colorKneePad || '#111111';
    const g = new THREE.Group();
    g.name = 'kneepad_' + (side < 0 ? 'L' : 'R');
    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .6 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.16), m);
    pad.position.set(0, -0.18, 0.02);
    g.add(pad);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .9 });
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.17), strapMat);
    strapTop.position.set(0, -0.12, 0.02); g.add(strapTop);
    const strapBot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.17), strapMat);
    strapBot.position.set(0, -0.24, 0.02); g.add(strapBot);
    return g;
  },

  buildElbowPad(cfg, side){
    const color = cfg.colorElbowPad || '#111111';
    const g = new THREE.Group();
    g.name = 'elbowpad_' + (side < 0 ? 'L' : 'R');
    const m = new THREE.MeshStandardMaterial({ color: color, roughness: .6 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.13), m);
    pad.position.set(0, -0.12, 0.02);
    g.add(pad);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .9 });
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), strapMat);
    strapTop.position.set(0, -0.07, 0.02); g.add(strapTop);
    const strapBot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), strapMat);
    strapBot.position.set(0, -0.17, 0.02); g.add(strapBot);
    return g;
  },

  updateCape(ch, time, playerSpeed, state, extra){
    if(!ch || !ch._capeMesh) return;
    const cape = ch._capeMesh;
    const mesh = cape.userData.capeMesh;
    const geo = cape.userData.geo;
    const orig = cape.userData.origPositions;
    if(!mesh || !geo || !orig) return;

    const TILT = 0.20;
    const SWING = 0.10;
    const FREQ = 1.3;
    const t = time;

    const pos = geo.attributes.position.array;
    const COLS = cape.userData.COLS;
    const ROWS = cape.userData.ROWS;
    const CAPE_H = cape.userData.CAPE_H;

    for(let row = 0; row < ROWS; row++){
      const tRow = row / (ROWS - 1);
      const bendFactor = 0.20 + tRow * tRow * 0.80;
      const bendZ = -TILT * CAPE_H * bendFactor * 0.5;
      const swingPhase = t * FREQ - tRow * 1.0;
      const swingZ = Math.sin(swingPhase) * SWING * bendFactor * 0.4;
      const swingY = Math.sin(swingPhase * 0.7 + 1.3) * SWING * 0.25 * bendFactor;
      const twist = Math.sin(swingPhase * 0.5 + 2.1) * SWING * 0.15 * bendFactor;

      for(let col = 0; col < COLS; col++){
        const idx = row * COLS + col;
        const i3 = idx * 3;
        const ox = orig[i3];
        const oy = orig[i3 + 1];
        const oz = orig[i3 + 2];
        pos[i3]     = ox + twist * ox * 0.5;
        pos[i3 + 1] = oy + swingY;
        pos[i3 + 2] = oz + bendZ + swingZ;
      }
    }
    geo.attributes.position.needsUpdate = true;

    cape.userData.frameSkip = (cape.userData.frameSkip || 0) + 1;
    if(cape.userData.frameSkip % 15 === 0){
      geo.computeVertexNormals();
    }
  }
};