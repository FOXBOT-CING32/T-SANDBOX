/* ============================================================
 * main.js · 启动 + 玩家逻辑 + 死亡 + 尸体 + UI 拖动
 * V1.0.0
 * ★ 第二阶段第 4 次迭代：无摇杆视觉，左侧纯移动区
 * ★ 第四阶段：读取角色名字同步到 HUD
 * ============================================================ */
window.TBOX = window.TBOX || {};

/* ============================================================
 * 加载角色配置
 * ============================================================ */
TBOX.loadCharConfig = function(){
  try {
    if(TBOX.Save && TBOX.Save.getChar){
      var cfg = TBOX.Save.getChar();
      if(cfg && TBOX.DATA.CHAR_DEFAULT){
        TBOX.DATA.CHAR_DEFAULT = Object.assign({}, TBOX.DATA.CHAR_DEFAULT, cfg);
      }
    }
  } catch(e){}
};

TBOX.Player = {
  x: 0, y: 0, z: 0, vy: 0,
  onGround: true, alive: true,
  runPhase: 0, speedFactor: 0,
  moveState: 'idle',
  moveDirX: 0, moveDirZ: 0,
  attackTimer: 0, attackType: 'none', attackCooldown: 0,
  hitStop: 0, combo: 0, comboTimer: 0,
  bodyLeanX: 0, bodyRollZ: 0, bodyTwistY: 0,
  jumpPhase: 'none', jumpTimer: 0, crouchJump: false,
  bigJump: false,
  camKick: 0, fovKick: 0,
  eyeH: 1.55,
  holdingL: false, holdingR: false,
  holdingHookL: false, holdingHookR: false,
  holdingHammer: false, holdingPalm: false,
  holdingElbowL: false, holdingElbowR: false,
  holdingLeftKick: false, holdingRightKick: false, holdingPush: false,
  holdingBlock: false,
  crouching: false, crouchAmt: 0,
  sprinting: false,
  inspecting: false, inspectTimer: 0,
  inspectCamZ: 0, inspectCamY: 0,
  inspectFistScale: 1,
  sliding: false, slideTimer: 0,
  slideDir: new THREE.Vector3(0, 0, -1), slideVis: 0,
  slideSide: 1,
  sprintKick: false,
  dodging: false, dodgeTimer: 0, dodgeDir: 0,
  dodgeType: 'side',
  kneeing: false, kneeTimer: 0, kneeSide: 1,
  climbing: false, climbTimer: 0, climbTwoHands: true, climbTarget: null,
  climbStartX: 0, climbStartY: 0, climbStartZ: 0,
  climbEndX: 0, climbEndY: 0, climbEndZ: 0,
  climbHanging: false,
  lastTapA: 0, lastTapD: 0, lastTapS: 0,
  hp: 100, maxHp: 100,
  stamina: 100, maxStamina: 100,
  staminaRegenDelay: 0,
  dead: false, deathTimer: 0, deathDir: 0, deathPhase: 'none',
  deathCount: 0,
  invulnerable: 0,
  knockedDown: false,
  knockTimer: 0,
  knockDir: 0,
  knockPhase: 'none',
  vx: 0, vz: 0,
  bounceCount: 0
};

var _tmpDir = new THREE.Vector3();

/* ============================================================
 * 玩家被击倒系统
 * ============================================================ */
TBOX.PlayerKnockdown = {
  knockDown(fromX, fromZ, force){
    var p = TBOX.Player;
    if(!p || p.dead || p.knockedDown) return;

    p.knockedDown = true;
    p.knockPhase = 'falling';
    p.knockTimer = 0;
    p.bounceCount = 0;

    var dx = p.x - fromX;
    var dz = p.z - fromZ;
    var dist = Math.hypot(dx, dz) || 1;
    var nx = dx / dist;
    var nz = dz / dist;

    var yaw = TBOX.Engine.camState.yaw;
    var fwdX = -Math.sin(yaw);
    var fwdZ = -Math.cos(yaw);
    var rgtX = Math.cos(yaw);
    var rgtZ = -Math.sin(yaw);

    var dotFwd = nx * fwdX + nz * fwdZ;
    var dotRgt = nx * rgtX + nz * rgtZ;

    if(Math.abs(dotFwd) > Math.abs(dotRgt)){
      p.knockDir = dotFwd > 0 ? 1 : -1;
    } else {
      p.knockDir = dotRgt > 0 ? 2 : -2;
    }

    p.vx = nx * (force || 6.0);
    p.vz = nz * (force || 6.0);

    p.attackTimer = 0;
    p.attackType = 'none';
    p.sliding = false;
    p.dodging = false;
    p.kneeing = false;
    p.climbing = false;
    p.climbHanging = false;
    p.inspecting = false;
    p.holdingBlock = false;
    p.sprinting = false;

    TBOX.Engine.triggerShake(0.5, 0.3);
    TBOX.Audio.playLand && TBOX.Audio.playLand();
  },

  update(dt){
    var p = TBOX.Player;
    if(!p || !p.knockedDown) return;

    p.knockTimer += dt;

    var KN = TBOX.DATA.KNOCKDOWN;
    var fallDur = KN.fallDur || 0.6;
    var lieDur = KN.lieDur || 1.2;
    var getUpDur = KN.getUpDur || 0.8;

    if(p.knockPhase === 'falling'){
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.vx *= (1 - dt * 3);
      p.vz *= (1 - dt * 3);

      if(p.knockTimer >= fallDur){
        p.knockPhase = 'lying';
        p.knockTimer = 0;
        p.vx = 0;
        p.vz = 0;
      }
    } else if(p.knockPhase === 'lying'){
      if(p.knockTimer >= lieDur){
        p.knockPhase = 'gettingUp';
        p.knockTimer = 0;
      }
    } else if(p.knockPhase === 'gettingUp'){
      if(p.knockTimer >= getUpDur){
        p.knockedDown = false;
        p.knockPhase = 'none';
        p.knockTimer = 0;
        p.vx = 0;
        p.vz = 0;
      }
    }
  }
};

function interruptInspect(){
  var p = TBOX.Player;
  if(p.inspecting){
    p.inspecting = false;
    p.inspectTimer = 0;
    p.inspectCamZ = 0; p.inspectCamY = 0;
    p.inspectFistScale = 1;
  }
}

function interruptClimb(){
  var p = TBOX.Player;
  if(p.climbing || p.climbHanging){
    p.climbing = false;
    p.climbHanging = false;
    p.climbTimer = 0;
    p.onGround = false;
    p.vy = 0;
  }
}

function interruptSlide(){
  var p = TBOX.Player;
  if(p.sliding){
    p.sliding = false;
    p.slideTimer = 0;
    p.slideVis = 0;
    TBOX.Engine.setViewRoll(0);
  }
}

function tryAttack(type){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.holdingBlock) return;
  if(p.knockedDown) return;

  interruptInspect();
  interruptSlide();

  if(p.attackTimer > 0 || p.attackCooldown > 0) return;
  if(p.stamina < TBOX.DATA.STAMINA_ATTACK_COST) return;
  p.stamina -= TBOX.DATA.STAMINA_ATTACK_COST;
  p.staminaRegenDelay = 1.5;

  var isSprintKick = type === 'sprintKick';
  var realType = isSprintKick ? 'leftKick' : type;
  p.attackType = realType;
  p.attackTimer = TBOX.DATA.ATK_DUR[realType] || 0.20;
  p.attackCooldown = 0.01;
  p.sprintKick = isSprintKick;
  var heavy = ['cross','hookL','hookR','hammer','elbowL','elbowR','leftKick','rightKick','knee','push'].indexOf(realType) >= 0;
  p.camKick = heavy ? 0.10 : 0.05;
  p.fovKick = heavy ? 6 : 3;
  TBOX.Audio.playWhoosh();
}

function tryJump(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.dodging || p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  if(p.onGround){
    p.vy = TBOX.DATA.JUMP_V;
    p.onGround = false;
    p.jumpPhase = 'crouch';
    p.jumpTimer = 0;
    p.crouchJump = p.crouching;
    p.bigJump = false;
    TBOX.Audio.playJump();
  }
}

function tryBigJump(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.dodging || p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  if(p.onGround){
    p.vy = TBOX.DATA.JUMP_V;
    p.onGround = false;
    p.jumpPhase = 'crouch';
    p.jumpTimer = 0;
    p.crouchJump = p.crouching;
    p.bigJump = true;
    TBOX.Audio.playJump();
  }
}

function tryInspect(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.inspecting) return;
  if(p.attackTimer > 0) return;
  if(p.sliding || p.kneeing || p.dodging) return;
  if(p.climbing || p.climbHanging) return;
  if(p.knockedDown) return;
  p.inspecting = true;
  p.inspectTimer = 0;
}

function trySlide(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.dodging || p.kneeing) return;
  if(!p.onGround) return;
  if(p.knockedDown) return;
  interruptInspect();
  if(p.sliding) return;
  p.sliding = true;
  p.slideTimer = 0;
  p.slideVis = 0;
  p.slideSide = Math.random() < 0.5 ? 1 : -1;
  TBOX.Engine.camera.getWorldDirection(_tmpDir);
  _tmpDir.y = 0;
  var l = Math.hypot(_tmpDir.x, _tmpDir.z);
  if(l > 0.0001){ _tmpDir.x /= l; _tmpDir.z /= l; }
  else _tmpDir.set(0, 0, -1);
  p.slideDir.copy(_tmpDir);
  p.sprinting = false;
  TBOX.Audio.playWhoosh();
}

function tryDodge(dir, type){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.dodging || p.kneeing) return;
  if(!p.onGround) return;
  if(p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  p.dodging = true;
  p.dodgeTimer = 0;
  p.dodgeDir = dir || 1;
  p.dodgeType = type || 'side';
}

function tryDodgeBack(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.dodging || p.kneeing) return;
  if(!p.onGround) return;
  if(p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  p.dodging = true;
  p.dodgeTimer = 0;
  p.dodgeType = Math.random() < 0.5 ? 'back' : 'backflip';
  p.dodgeDir = 0;
}

function tryKnee(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.kneeing || p.sliding) return;
  if(!p.onGround) return;
  if(p.holdingBlock) return;
  if(p.knockedDown) return;
  interruptInspect();
  p.kneeing = true;
  p.kneeTimer = 0;
  p.kneeSide = Math.random() < 0.5 ? 1 : -1;
  p.attackType = 'knee';
  p.attackTimer = TBOX.DATA.ATK_DUR.knee;
  p.attackCooldown = 0.01;
  p.camKick = 0.10;
  TBOX.Audio.playKick();
}

function tryPush(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.holdingBlock) return;
  if(p.knockedDown) return;
  if(p.attackTimer > 0 || p.attackCooldown > 0) return;
  interruptInspect();
  interruptSlide();
  p.attackType = 'push';
  p.attackTimer = TBOX.DATA.ATK_DUR.push;
  p.attackCooldown = TBOX.DATA.PUSH.cooldown;
  p.camKick = 0.10;
  p.fovKick = 5;
  TBOX.Audio.playWhoosh();
}

function trySprintKick(side){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(!p.sprinting || p.speedFactor < 0.5) return;
  if(p.attackTimer > 0 || p.attackCooldown > 0) return;
  if(p.holdingBlock) return;
  if(p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  var type = side === 'left' ? 'leftKick' : 'rightKick';
  p.attackType = type;
  p.attackTimer = TBOX.DATA.ATK_DUR[type] || 0.46;
  p.attackCooldown = 0.01;
  p.sprintKick = true;
  p.camKick = 0.15;
  p.fovKick = 8;
  TBOX.Audio.playWhoosh();
}

function tryClimb(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.knockedDown) return;

  if(p.climbHanging){
    p.climbHanging = false;
    p.climbing = true;
    p.climbTimer = 0;
    if(p.climbTarget){
      p.climbEndX = p.climbTarget.x;
      p.climbEndY = p.climbTarget.topY;
      p.climbEndZ = p.climbTarget.z - (p.climbTarget.halfD || 0.5) + 0.2;
    }
    return;
  }

  if(p.climbing) return;
  if(!p.onGround) return;
  interruptInspect();
  interruptSlide();

  var yaw = TBOX.Engine.camState.yaw;
  var fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  var best = null;
  var bestDist = 99;

  for(var i = 0; i < TBOX.Engine.stairs.length; i++){
    var s = TBOX.Engine.stairs[i];
    var dx = s.x - p.x;
    var dz = s.z - p.z;
    var dist = Math.hypot(dx, dz);
    if(dist > TBOX.DATA.CLIMB_RANGE * 1.5) continue;
    var dh = s.topY - p.y;
    if(dh <= 0.2) continue;
    if(dh > TBOX.DATA.CLIMB_MAX_HEIGHT) continue;
    var toX = dx / dist, toZ = dz / dist;
    var dot = fwd.x * toX + fwd.z * toZ;
    if(dot < 0.3) continue;
    if(dist < bestDist){ best = s; bestDist = dist; }
  }

  if(!best && TBOX.DATA.CLIMB_ANY_SURFACE){
    var wx = p.x + fwd.x * TBOX.DATA.CLIMB_WALL_DETECT_RANGE;
    var wz = p.z + fwd.z * TBOX.DATA.CLIMB_WALL_DETECT_RANGE;
    var groundY = TBOX.Engine.resolvePlayerGround({ x: wx, z: wz, y: p.y + 3 });
    if(groundY > p.y + TBOX.DATA.CLIMB_MIN_HEIGHT && groundY < p.y + TBOX.DATA.CLIMB_MAX_HEIGHT){
      best = { x: wx, z: wz, topY: groundY, halfW: 0.5, halfD: 0.5, virtual: true };
    }
  }

  if(!best){
    var T = TBOX.DATA.TEXT[TBOX.Save.get('tbox_lang', 'zh')] || TBOX.DATA.TEXT.zh;
    TBOX.UI.toast(T.toastClimbNo);
    return;
  }

  var climbHeight = best.topY - p.y;
  p.climbTwoHands = climbHeight > TBOX.DATA.CLIMB_ONE_HAND_H;

  p.climbing = true;
  p.climbTimer = 0;
  p.climbTarget = best;
  p.climbStartX = p.x;
  p.climbStartY = p.y;
  p.climbStartZ = p.z;
  p.climbEndX = best.x;
  p.climbEndY = best.topY;
  p.climbEndZ = best.z - (best.halfD || 0.5) + 0.2;
  TBOX.Audio.playClimb();
}

function tryBlockStart(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead) return;
  if(p.climbing || p.climbHanging) return;
  if(p.knockedDown) return;
  interruptInspect();
  interruptSlide();
  p.holdingBlock = true;
}

function tryBlockEnd(){
  TBOX.Player.holdingBlock = false;
}

function damagePlayer(amount, fromDir){
  var p = TBOX.Player;
  if(p.dead || p.invulnerable > 0) return;
  p.hp = Math.max(0, p.hp - amount);
  p.staminaRegenDelay = 2.0;
  TBOX.UI.flashHurt(amount);
  TBOX.Engine.triggerHitShake(amount);
  TBOX.Audio.playHurt && TBOX.Audio.playHurt();
  if(p.hp <= 0) killPlayer(fromDir);
}

function killPlayer(fromDir){
  var p = TBOX.Player;
  if(p.dead) return;
  p.dead = true;
  p.alive = false;
  p.deathTimer = 0;
  p.deathDir = fromDir || 0;
  p.deathPhase = 'falling';
  p.deathCount++;

  if(TBOX.NetAudio && TBOX.NetAudio.play){
    TBOX.NetAudio.play('tinnitus', TBOX.DATA.TINNITUS.volume);
  }
  if(TBOX.Audio && TBOX.Audio.playTinnitus){
    TBOX.Audio.playTinnitus();
  }
}
window.killPlayer = killPlayer;

function respawnPlayer(){
  var p = TBOX.Player;
  p.dead = false;
  p.alive = true;
  p.deathPhase = 'none';
  p.hp = p.maxHp;
  p.stamina = p.maxStamina;

  var STAIRS = TBOX.DATA.STAIRS;
  var cx = STAIRS.baseX;
  var cz = STAIRS.baseZ + STAIRS.depth * STAIRS.count * 0.5;
  var R = TBOX.DATA.RESPAWN_RADIUS;

  var sx = 0, sz = 0;
  for(var attempt = 0; attempt < 20; attempt++){
    var angle = Math.random() * Math.PI * 2;
    var dist = 4 + Math.random() * R;
    sx = cx + Math.cos(angle) * dist;
    sz = cz + Math.sin(angle) * dist;
    var inStair = false;
    for(var i = 0; i < TBOX.Engine.stairs.length; i++){
      var s = TBOX.Engine.stairs[i];
      if(Math.abs(sx - s.x) < s.halfW + 1 && Math.abs(sz - s.z) < s.halfD + 1){
        inStair = true; break;
      }
    }
    if(!inStair) break;
  }
  p.x = sx;
  p.z = sz;
  p.y = 0;
  p.vy = 0;
  p.onGround = true;

  p.attackTimer = 0; p.attackType = 'none';
  p.attackCooldown = 0; p.hitStop = 0;
  p.sliding = false; p.kneeing = false; p.dodging = false;
  p.climbing = false; p.climbHanging = false;
  p.inspecting = false;
  p.invulnerable = 2.0;
  p.slideVis = 0;
  p.slideSide = 1;
  p.holdingBlock = false;
  p.knockedDown = false;
  p.knockPhase = 'none';
  p.knockTimer = 0;
  p.vx = 0; p.vz = 0;
  p.bounceCount = 0;
  TBOX.Engine.setViewRoll(0);

  TBOX.Engine.camState.yaw = 0;
  TBOX.Engine.camState.pitch = 0;

  if(TBOX.Action.character){
    TBOX.Action.character.root.rotation.x = 0;
    TBOX.Action.character.root.rotation.z = 0;
    if(TBOX.Action.character.head && TBOX.Action.character.head.material){
      TBOX.Action.character.head.material.opacity = 0;
    }
  }

  var ds = document.getElementById('deathScreen');
  if(ds) ds.style.opacity = '0';
  var hv = document.getElementById('hurtVignette');
  if(hv) hv.style.opacity = '0';
  var blink = document.getElementById('blinkOverlay');
  if(blink) blink.style.opacity = '0';

  TBOX.UI.hideDeathScreen();
}
window.respawnPlayer = respawnPlayer;
window.damagePlayer = damagePlayer;

function updatePlayer(dt, now){
  var p = TBOX.Player;
  var E = TBOX.Engine;
  var U = TBOX.Utils;

  if(p.dead){
    p.deathTimer += dt;
    if(p.deathTimer >= TBOX.DATA.DEATH.respawnAt){
      respawnPlayer();
    }
    return;
  }

  if(p.knockedDown){
    if(TBOX.PlayerKnockdown && TBOX.PlayerKnockdown.update){
      TBOX.PlayerKnockdown.update(dt);
    }
    return;
  }

  if(p.invulnerable > 0) p.invulnerable -= dt;

  var mx = 0, mz = 0;
  if(E.isTouch){
    mx = window.TBOX_Joy ? window.TBOX_Joy.x : 0;
    mz = window.TBOX_Joy ? window.TBOX_Joy.y : 0;
  } else {
    if(E.keys['KeyW'] || E.keys['ArrowUp'])    mz -= 1;
    if(E.keys['KeyS'] || E.keys['ArrowDown'])  mz += 1;
    if(E.keys['KeyA'] || E.keys['ArrowLeft'])  mx -= 1;
    if(E.keys['KeyD'] || E.keys['ArrowRight']) mx += 1;
    var l = Math.hypot(mx, mz);
    if(l > 1){ mx /= l; mz /= l; }
  }
  p.moveDirX = mx;
  p.moveDirZ = mz;

  var inputMag = Math.hypot(mx, mz);
  if(p.inspecting && inputMag > 0.3){
    interruptInspect();
  }

  var cy = Math.cos(E.camState.yaw), sy = Math.sin(E.camState.yaw);
  var fwdX = -sy, fwdZ = -cy;
  var rgtX = cy, rgtZ = -sy;

  var isSprinting = p.sprinting && inputMag > 0.3;

  var curSpeed = TBOX.DATA.RUN_SPEED;
  if(p.sliding) curSpeed = TBOX.DATA.SPRINT_SPEED;
  else if(p.crouching) curSpeed = TBOX.DATA.CROUCH_SPEED;
  else if(isSprinting && p.stamina > 0) curSpeed = TBOX.DATA.SPRINT_SPEED;
  else if(inputMag > 0.5) curSpeed = TBOX.DATA.RUN_SPEED;
  else curSpeed = TBOX.DATA.WALK_SPEED;

  if(p.holdingBlock && !p.sliding){
    curSpeed *= TBOX.DATA.BLOCK.moveSpeedMul;
  }

  if(isSprinting && inputMag > 0.3 && p.stamina > 0){
    p.stamina = Math.max(0, p.stamina - TBOX.DATA.STAMINA_SPRINT_COST * dt);
    p.staminaRegenDelay = 0.5;
    if(p.stamina <= 0){ p.sprinting = false; }
  }

  if(p.staminaRegenDelay > 0) p.staminaRegenDelay -= dt;
  else if(p.stamina < p.maxStamina){
    p.stamina = Math.min(p.maxStamina, p.stamina + TBOX.DATA.STAMINA_REGEN * dt);
  }

  var vx, vz;
  if(p.sliding){
    vx = p.slideDir.x * curSpeed;
    vz = p.slideDir.z * curSpeed;
  } else {
    vx = (rgtX * mx + fwdX * (-mz)) * curSpeed;
    vz = (rgtZ * mx + fwdZ * (-mz)) * curSpeed;
  }
  if(p.bigJump && !p.onGround){
    vx *= TBOX.DATA.BIG_JUMP_HORIZ_MUL;
    vz *= TBOX.DATA.BIG_JUMP_HORIZ_MUL;
  }
  if(p.dodging){
    if(p.dodgeType === 'back'){
      vx += fwdX * -TBOX.DATA.DODGE.backSpeed;
      vz += fwdZ * -TBOX.DATA.DODGE.backSpeed;
    } else if(p.dodgeType === 'backflip'){
      vx += fwdX * -TBOX.DATA.DODGE.backSpeed * 1.4;
      vz += fwdZ * -TBOX.DATA.DODGE.backSpeed * 1.4;
    } else {
      vx += rgtX * p.dodgeDir * TBOX.DATA.DODGE.sideDist;
      vz += rgtZ * p.dodgeDir * TBOX.DATA.DODGE.sideDist;
    }
  }
  if(!p.climbing && !p.climbHanging && isFinite(vx) && isFinite(vz)){
    p.x += vx * dt;
    p.z += vz * dt;
  }

  E.resolvePlayerCollision(p);

  var moving = inputMag > 0.08;
  p.speedFactor = U.lerp(p.speedFactor, moving ? 1 : 0, Math.min(1, dt * 10));
  if(moving && !p.kneeing && !p.climbing && !p.climbHanging){
    var stride = p.sliding ? 4 : (p.crouching ? 6 : (isSprinting ? 13 : (inputMag > 0.5 ? 9.5 : 7)));
    p.runPhase += dt * stride;
  }

  var groundY = E.resolvePlayerGround(p);

  if(p.climbing || p.climbHanging){
    p.vy = 0;
  } else if(!p.onGround){
    p.vy += TBOX.DATA.GRAVITY * dt * (TBOX.DATA.GRAVITY_MUL || 1);
    p.y += p.vy * dt;

    if(p.y <= groundY + 0.001){
      p.y = groundY;
      p.vy = 0;
      p.onGround = true;
      p.jumpPhase = 'land';
      p.jumpTimer = 0;
      p.bigJump = false;
      TBOX.Audio.playLand();
    } else {
      if(p.jumpPhase === 'crouch'){
        p.jumpTimer += dt;
        if(p.jumpTimer >= 0.10){ p.jumpPhase = 'air'; p.jumpTimer = 0; }
      } else p.jumpTimer += dt;
    }
  } else {
    if(p.y > groundY + 0.01){
      p.onGround = false;
      p.vy = 0;
    } else {
      p.y = groundY;
      if(p.jumpPhase === 'land'){
        p.jumpTimer += dt;
        if(p.jumpTimer >= 0.14){ p.jumpPhase = 'none'; p.crouchJump = false; }
      }
    }
  }

  var slideVisTarget = 0;
  if(p.sliding) slideVisTarget = Math.sin(Math.min(1, p.slideTimer / TBOX.DATA.SLIDE_DUR) * Math.PI);
  p.slideVis = U.lerp(p.slideVis, slideVisTarget, Math.min(1, dt * 10));
  TBOX.UI.setSpeedLines(p.slideVis);

  updateAttack(dt);
}

function updateAttack(dt){
  var p = TBOX.Player;
  if(p.attackCooldown > 0) p.attackCooldown -= dt;
  if(p.attackTimer > 0){
    var prev = p.attackTimer;
    p.attackTimer -= dt;
    var total = TBOX.DATA.ATK_DUR[p.attackType] || 0.20;
    var prevP = 1 - prev / total;
    var curP = 1 - Math.max(0, p.attackTimer) / total;
    var hitAt = TBOX.DATA.ATK_HIT_AT[p.attackType] || 0.35;
    if(prevP < hitAt && curP >= hitAt) TBOX.AI.resolveAttackHit();
    if(p.attackTimer <= 0){
      p.attackTimer = 0;
      p.attackType = 'none';
      p.sprintKick = false;
    }
  }
  if(p.comboTimer > 0){
    p.comboTimer -= dt;
    if(p.comboTimer <= 0) p.combo = 0;
  }
  updateHoldAttacks();
}

function updateHoldAttacks(){
  var p = TBOX.Player;
  if(p.attackTimer > 0 || p.attackCooldown > 0) return;
  if(p.climbing || p.climbHanging) return;
  if(p.holdingBlock) return;
  if(p.knockedDown) return;
  if(p.holdingL) tryAttack('jab');
  else if(p.holdingR) tryAttack('cross');
  else if(p.holdingHookL) tryAttack('hookL');
  else if(p.holdingHookR) tryAttack('hookR');
  else if(p.holdingElbowL) tryAttack('elbowL');
  else if(p.holdingElbowR) tryAttack('elbowR');
  else if(p.holdingHammer) tryAttack('hammer');
  else if(p.holdingPalm) tryAttack('palm');
  else if(p.holdingLeftKick){
    if(p.crouching) tryAttack('knee');
    else if(p.sprinting && p.speedFactor > 0.3) trySprintKick('left');
    else tryAttack('leftKick');
  }
  else if(p.holdingRightKick){
    if(p.sprinting && p.speedFactor > 0.3) trySprintKick('right');
    else tryAttack('rightKick');
  }
  else if(p.holdingPush) tryPush();
}

function bindInputEvents(){
  var E = TBOX.Engine;
  var p = TBOX.Player;

  TBOX.Events.on('input:keydown', function(e){
    if(e.code === 'Escape'){
      e.preventDefault();
      TBOX.Engine.pause();
      TBOX.UI.showBackOverlay();
      if(!E.isTouch && E.controls && E.controls.isLocked) E.controls.unlock();
      return;
    }
    if(e.code === 'Space'){
      e.preventDefault();
      if(p.sprinting) tryBigJump();
      else tryJump();
    }
    if(e.code === 'KeyC'){
      e.preventDefault();
      if(p.sprinting && p.speedFactor > 0.3) trySlide();
      else {
        if(p.inspecting) interruptInspect();
        p.crouching = !p.crouching;
      }
    }
    if(e.code === 'ControlLeft' || e.code === 'ControlRight'){ e.preventDefault(); tryKnee(); }
    if(e.code === 'KeyN'){ e.preventDefault(); tryClimb(); }
    if(e.code === 'KeyA'){
      var now = performance.now();
      if(now - p.lastTapA < 250) tryDodge(-1, 'side');
      p.lastTapA = now;
    }
    if(e.code === 'KeyD'){
      var now2 = performance.now();
      if(now2 - p.lastTapD < 250) tryDodge(1, 'side');
      p.lastTapD = now2;
    }
    if(e.code === 'KeyS'){
      var now3 = performance.now();
      if(now3 - p.lastTapS < 250) tryDodgeBack();
      p.lastTapS = now3;
    }
    if(e.code === 'KeyQ'){
      e.preventDefault();
      if(p.crouching) tryAttack('knee');
      else if(p.sprinting && p.speedFactor > 0.3) trySprintKick('left');
      else tryAttack('leftKick');
      p.holdingLeftKick = true;
    }
    if(e.code === 'KeyE'){ e.preventDefault(); p.holdingPush = true; tryPush(); }
    if(e.code === 'KeyR'){
      e.preventDefault();
      if(p.sprinting && p.speedFactor > 0.3) trySprintKick('right');
      else tryAttack('rightKick');
      p.holdingRightKick = true;
    }
    if(e.code === 'KeyV'){ e.preventDefault(); p.holdingHookL = true; tryAttack('hookL'); }
    if(e.code === 'KeyB'){ e.preventDefault(); p.holdingHookR = true; tryAttack('hookR'); }
    if(e.code === 'KeyM'){ e.preventDefault(); p.holdingHammer = true; tryAttack('hammer'); }
    if(e.code === 'Comma'){ e.preventDefault(); p.holdingPalm = true; tryAttack('palm'); }
    if(e.code === 'KeyG'){ e.preventDefault(); p.holdingElbowL = true; tryAttack('elbowL'); }
    if(e.code === 'KeyH'){ e.preventDefault(); p.holdingElbowR = true; tryAttack('elbowR'); }
    if(e.code === 'KeyF'){ e.preventDefault(); tryBlockStart(); }
    if(e.code === 'KeyI'){ e.preventDefault(); tryInspect(); }
    if(e.code === 'KeyT'){ e.preventDefault(); E.toggleView(); }
    if(e.code === 'ShiftLeft' || e.code === 'ShiftRight'){ e.preventDefault(); p.sprinting = !p.sprinting; }
  });

  TBOX.Events.on('input:keyup', function(e){
    if(e.code === 'KeyQ') p.holdingLeftKick = false;
    if(e.code === 'KeyE') p.holdingPush = false;
    if(e.code === 'KeyR') p.holdingRightKick = false;
    if(e.code === 'KeyV') p.holdingHookL = false;
    if(e.code === 'KeyB') p.holdingHookR = false;
    if(e.code === 'KeyM') p.holdingHammer = false;
    if(e.code === 'Comma') p.holdingPalm = false;
    if(e.code === 'KeyG') p.holdingElbowL = false;
    if(e.code === 'KeyH') p.holdingElbowR = false;
    if(e.code === 'KeyF') p.holdingBlock = false;
  });

  TBOX.Events.on('input:lmb', function(v){
    p.holdingL = v;
    if(v) tryAttack('jab');
  });
  TBOX.Events.on('input:rmb', function(v){
    p.holdingR = v;
    if(v) tryAttack('cross');
  });
}

function bindBackOverlay(){
  var ov = document.getElementById('backOverlay');
  if(!ov) return;
  var r = document.getElementById('backResume');
  var q = document.getElementById('backQuit');
  var s = document.getElementById('backSettings');
  var c = document.getElementById('backControls');
  var a = document.getElementById('backAbout');

  if(r) r.addEventListener('click', function(){
    TBOX.UI.hideBackOverlay();
    TBOX.Engine.resume();
    if(!TBOX.Engine.isTouch && TBOX.Engine.controls) TBOX.Engine.controls.lock();
  });
  if(q) q.addEventListener('click', function(){ window.location.href = 'index.html'; });
  if(s) s.addEventListener('click', function(){ TBOX.UI.toast('设置请返回主菜单调整'); });
  if(c) c.addEventListener('click', function(){ TBOX.UI.toast('操作请返回主菜单查看'); });
  if(a) a.addEventListener('click', function(){ TBOX.UI.toast('T-BOX · ' + (TBOX.DATA.VERSION_LABEL || 'V1.0.0')); });
}

/* ============================================================
 * 触摸端：左侧纯移动区（无摇杆视觉）+ 右侧视角
 * ============================================================ */
function bindTouchControls(){
  if(!TBOX.Engine.isTouch) return;

  window.TBOX_Joy = {
    x: 0, y: 0, active: false, id: null, cx: 0, cy: 0, R: 0
  };

  var joyZone = document.getElementById('joyZone');
  var lookZone = document.getElementById('lookZone');

  if(joyZone){
    joyZone.addEventListener('touchstart', function(e){
      e.preventDefault();
      if(window.TBOX_Joy.active) return;
      var t = e.changedTouches[0];
      var J = window.TBOX_Joy;
      J.id = t.identifier;
      J.active = true;
      J.cx = t.clientX;
      J.cy = t.clientY;
      J.R = Math.min(window.innerWidth, window.innerHeight) * 0.14;
      J.x = 0;
      J.y = 0;
    }, { passive: false });

    joyZone.addEventListener('touchmove', function(e){
      e.preventDefault();
      var J = window.TBOX_Joy;
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(t.identifier !== J.id) continue;
        var dx = t.clientX - J.cx;
        var dy = t.clientY - J.cy;
        var len = Math.hypot(dx, dy);
        if(len > J.R){ dx = dx / len * J.R; dy = dy / len * J.R; }
        J.x = dx / J.R;
        J.y = dy / J.R;
        var dead = TBOX.Save.getNum('tbox_joyDead', 15) / 100;
        if(Math.hypot(J.x, J.y) < dead){ J.x = 0; J.y = 0; }
      }
    }, { passive: false });

    var joyEnd = function(e){
      e.preventDefault();
      var J = window.TBOX_Joy;
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(t.identifier !== J.id) continue;
        J.id = null;
        J.active = false;
        J.x = 0;
        J.y = 0;
      }
    };
    joyZone.addEventListener('touchend', joyEnd, { passive: false });
    joyZone.addEventListener('touchcancel', joyEnd, { passive: false });
  }

  if(lookZone){
    var lookId = null, lastX = 0, lastY = 0;
    lookZone.addEventListener('touchstart', function(e){
      e.preventDefault();
      var t = e.changedTouches[0];
      lookId = t.identifier;
      lastX = t.clientX;
      lastY = t.clientY;
    }, { passive: false });
    lookZone.addEventListener('touchmove', function(e){
      e.preventDefault();
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(t.identifier !== lookId) continue;
        var dx = t.clientX - lastX;
        var dy = t.clientY - lastY;
        lastX = t.clientX;
        lastY = t.clientY;
        var speed = Math.min(2.5, Math.hypot(dx, dy) / 12);
        var sens = TBOX.Save.getNum('tbox_sens', 22);
        var s = TBOX.DATA.SENS_BASE_TOUCH * (1 + speed) * (sens / 22);
        var invertY = TBOX.Save.get('tbox_invertY', '0') === '1' ? -1 : 1;
        TBOX.Engine.camState.yaw -= dx * s;
        TBOX.Engine.camState.pitch -= dy * s * invertY;
        TBOX.Engine.camState.pitch = TBOX.Utils.clamp(
          TBOX.Engine.camState.pitch,
          TBOX.DATA.PITCH_MIN, TBOX.DATA.PITCH_MAX
        );
      }
    }, { passive: false });
    lookZone.addEventListener('touchend', function(e){
      e.preventDefault();
      for(var i = 0; i < e.changedTouches.length; i++){
        if(e.changedTouches[i].identifier === lookId) lookId = null;
      }
    }, { passive: false });
    lookZone.addEventListener('touchcancel', function(e){
      e.preventDefault();
      lookId = null;
    }, { passive: false });
  }
}

/* ============================================================
 * 触摸端：按键绑定
 * ============================================================ */
function bindTouchButtons(){
  function bindKey(id, onDown, onUp, holdRepeat){
    var el = document.getElementById(id);
    if(!el) return;
    var pressed = false;
    var repeatTimer = null;

    function press(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      if(pressed) return;
      pressed = true;
      el.classList.add('press');
      try { onDown && onDown(); } catch(err){ console.warn('btn err', err); }
      if(holdRepeat && onDown){
        repeatTimer = setTimeout(function(){
          if(!pressed) return;
          repeatTimer = setInterval(function(){
            if(!pressed) return;
            try { onDown(); } catch(err){}
          }, 160);
        }, 240);
      }
    }
    function release(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      if(!pressed) return;
      pressed = false;
      el.classList.remove('press');
      if(repeatTimer){ clearTimeout(repeatTimer); clearInterval(repeatTimer); repeatTimer = null; }
      try { onUp && onUp(); } catch(err){ console.warn('btn err', err); }
    }
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
  }

  var p = TBOX.Player;

  bindKey('btnJab',      function(){ p.holdingL = true; tryAttack('jab'); },       function(){ p.holdingL = false; }, true);
  bindKey('btnHook',     function(){ p.holdingHookL = true; tryAttack('hookL'); }, function(){ p.holdingHookL = false; }, true);
  bindKey('btnElbowL',   function(){ p.holdingElbowL = true; tryAttack('elbowL'); }, function(){ p.holdingElbowL = false; }, true);
  bindKey('btnHammerL',  function(){ p.holdingHammer = true; tryAttack('hammer'); }, function(){ p.holdingHammer = false; }, true);

  bindKey('btnCross',    function(){ p.holdingR = true; tryAttack('cross'); },     function(){ p.holdingR = false; }, true);
  bindKey('btnHookR',    function(){ p.holdingHookR = true; tryAttack('hookR'); }, function(){ p.holdingHookR = false; }, true);
  bindKey('btnElbowR',   function(){ p.holdingElbowR = true; tryAttack('elbowR'); }, function(){ p.holdingElbowR = false; }, true);
  bindKey('btnPalmR',    function(){ p.holdingPalm = true; tryAttack('palm'); },   function(){ p.holdingPalm = false; }, true);

  bindKey('btnLeftKick', function(){
    p.holdingLeftKick = true;
    if(p.sprinting && p.speedFactor > 0.3) trySprintKick('left');
    else tryAttack('leftKick');
  }, function(){ p.holdingLeftKick = false; }, true);
  bindKey('btnRightKick', function(){
    p.holdingRightKick = true;
    if(p.sprinting && p.speedFactor > 0.3) trySprintKick('right');
    else tryAttack('rightKick');
  }, function(){ p.holdingRightKick = false; }, true);
  bindKey('btnBackSpin', function(){ p.holdingPush = true; tryPush(); }, function(){ p.holdingPush = false; }, true);
  bindKey('btnKnee',     function(){ tryKnee(); }, null, true);

  bindKey('btnJump',     function(){ if(p.sprinting) tryBigJump(); else tryJump(); }, null, true);
  bindKey('btnCrouch',   function(){
    if(p.sprinting && p.speedFactor > 0.3) trySlide();
    else { if(p.inspecting) interruptInspect(); p.crouching = !p.crouching; }
  }, null, false);
  bindKey('btnSprint',   function(){ p.sprinting = !p.sprinting; }, null, false);
  bindKey('btnBlock',    function(){ tryBlockStart(); }, function(){ tryBlockEnd(); }, false);
  bindKey('btnClimb',    function(){ tryClimb(); }, null, true);

  bindKey('btnView',     function(){ TBOX.Engine.toggleView(); }, null, false);
  bindKey('btnInspect',  function(){ tryInspect(); }, null, false);
}

function applyLang(){
  TBOX.UI.applyLang();
}

/* ============================================================
 * 布局编辑器（游戏内）
 * ============================================================ */
TBOX.Layout = {
  editing: false,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  _bound: false,
  _savedSnapshot: null,

  init(){
    if(!TBOX.Engine.isTouch) return;
    if(this._bound) return;
    this._bound = true;
    this._bindDrag();
    this._bindEditButtons();
    this._loadLayout();
    if(location.search.indexOf('edit=1') >= 0){
      setTimeout(function(){ TBOX.Layout.enterEdit(); }, 400);
    }
  },

  _bindDrag(){
    var self = this;
    document.addEventListener('touchmove', function(e){
      if(!self.editing || !self.dragTarget) return;
      e.preventDefault();
      var t = e.changedTouches[0];
      var el = self.dragTarget;
      var rect = el.parentElement.getBoundingClientRect();
      var x = t.clientX - rect.left - self.dragOffset.x;
      var y = t.clientY - rect.top - self.dragOffset.y;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }, { passive: false });
    document.addEventListener('touchend', function(){
      if(!self.editing) return;
      self.dragTarget = null;
      self.saveLayout();
    });
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      el.addEventListener('touchstart', function(e){
        if(!self.editing) return;
        e.preventDefault();
        e.stopPropagation();
        self.dragTarget = el;
        var t = e.changedTouches[0];
        var rect = el.getBoundingClientRect();
        self.dragOffset.x = t.clientX - rect.left;
        self.dragOffset.y = t.clientY - rect.top;
      }, { passive: false });
    });
  },

  _bindEditButtons(){
    var self = this;
    var bind = function(id, fn){
      var el = document.getElementById(id);
      if(!el) return;
      var handler = function(e){
        e.preventDefault();
        e.stopPropagation();
        fn();
      };
      el.addEventListener('click', handler);
      el.addEventListener('touchend', handler);
    };
    bind('editBack', function(){ self.exitEdit(false); });
    bind('editDone', function(){ self.exitEdit(true); });
    bind('editAuto', function(){ self.autoLayout(); });
    bind('editReset', function(){ self.reset(); });
  },

  enterEdit(){
    if(this.editing) return;
    this.editing = true;
    this._savedSnapshot = this._snapshot();
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      el.style.outline = '2px dashed #4fd1ff';
      el.style.pointerEvents = 'auto';
    });
    var topBar = document.getElementById('editTopBar');
    var bottomBar = document.getElementById('editBottomBar');
    var hint = document.getElementById('editHint');
    if(topBar) topBar.classList.add('on');
    if(bottomBar) bottomBar.classList.add('on');
    if(hint) hint.classList.add('on');
    var backBtn = document.getElementById('btnBackGame');
    if(backBtn) backBtn.style.display = 'none';
  },

  exitEdit(save){
    if(!this.editing) return;
    this.editing = false;
    this.dragTarget = null;
    if(!save && this._savedSnapshot){
      this._restore(this._savedSnapshot);
    } else if(save){
      this.saveLayout();
      TBOX.UI.toast((TBOX.DATA.TEXT[TBOX.Save.get('tbox_lang', 'zh')] || TBOX.DATA.TEXT.zh).toastEditSaved);
    }
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      el.style.outline = '';
    });
    var topBar = document.getElementById('editTopBar');
    var bottomBar = document.getElementById('editBottomBar');
    var hint = document.getElementById('editHint');
    if(topBar) topBar.classList.remove('on');
    if(bottomBar) bottomBar.classList.remove('on');
    if(hint) hint.classList.remove('on');
    var backBtn = document.getElementById('btnBackGame');
    if(backBtn) backBtn.style.display = 'flex';
  },

  _snapshot(){
    var snap = {};
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      if(!el.id) return;
      snap[el.id] = {
        left: el.style.left, top: el.style.top,
        right: el.style.right, bottom: el.style.bottom
      };
    });
    return snap;
  },

  _restore(snap){
    for(var id in snap){
      var el = document.getElementById(id);
      if(!el) continue;
      var d = snap[id];
      el.style.left = d.left || '';
      el.style.top = d.top || '';
      el.style.right = d.right || '';
      el.style.bottom = d.bottom || '';
    }
  },

  autoLayout(){
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      el.style.left = ''; el.style.top = '';
      el.style.right = ''; el.style.bottom = '';
      el.style.width = ''; el.style.height = '';
    });
    try { localStorage.removeItem('tbox_uiLayout'); } catch(e){}
    TBOX.UI.toast((TBOX.DATA.TEXT[TBOX.Save.get('tbox_lang','zh')] || TBOX.DATA.TEXT.zh).toastEditAuto);
  },

  saveLayout(){
    try {
      var layout = this._snapshot();
      localStorage.setItem('tbox_uiLayout', JSON.stringify(layout));
    } catch(e){}
  },

  _loadLayout(){
    try {
      var raw = localStorage.getItem('tbox_uiLayout');
      if(!raw) return;
      var layout = JSON.parse(raw);
      var W = window.innerWidth, H = window.innerHeight;
      for(var id in layout){
        var el = document.getElementById(id);
        if(!el) continue;
        var d = layout[id];
        if(d.x !== undefined && d.y !== undefined){
          var pw = (d.w !== undefined ? d.w : 0.065) * W;
          var ph = (d.h !== undefined ? d.h : 0.12) * H;
          el.style.left = (d.x * W - pw / 2) + 'px';
          el.style.top  = (d.y * H - ph / 2) + 'px';
          if(d.w !== undefined) el.style.width = pw + 'px';
          if(d.h !== undefined) el.style.height = ph + 'px';
          el.style.right = 'auto';
          el.style.bottom = 'auto';
        } else if(d.left || d.top){
          el.style.left = d.left || '';
          el.style.top = d.top || '';
          el.style.right = d.right || '';
          el.style.bottom = d.bottom || '';
        }
      }
    } catch(e){}
  },

  reset(){
    try { localStorage.removeItem('tbox_uiLayout'); } catch(e){}
    document.querySelectorAll('#touchUI .key').forEach(function(el){
      el.style.left = ''; el.style.top = '';
      el.style.right = ''; el.style.bottom = '';
      el.style.width = ''; el.style.height = '';
    });
    TBOX.UI.toast((TBOX.DATA.TEXT[TBOX.Save.get('tbox_lang','zh')] || TBOX.DATA.TEXT.zh).toastEditReset);
  }
};

/* ============================================================
 * 网络音效
 * ============================================================ */
TBOX.NetAudio = {
  list: {
    tinnitus: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    dyingBreath: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    heartbeatSlow: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_1d84f6a2e4.mp3',
    heartbeatFast: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_c9a1c4f3a9.mp3',
    lastBreath: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_4c9a4f0b1c.mp3'
  },
  loaded: {},
  load(){
    for(var key in this.list){
      if(this.loaded[key]) continue;
      var audio = new Audio();
      audio.src = this.list[key];
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.loaded[key] = audio;
    }
  },
  play(key, volume){
    var a = this.loaded[key];
    if(!a) return;
    try {
      var clone = a.cloneNode();
      clone.volume = volume || 0.5;
      clone.play().catch(function(){});
    } catch(e){}
  }
};

/* ============================================================
 * 启动
 * ============================================================ */
function TBOX_START(){
  if(TBOX.Engine && TBOX.Engine.running) return;
  try {
    console.log('T-BOX starting...', TBOX.DATA && TBOX.DATA.VERSION_LABEL);

    var missing = [];
    if(typeof TBOX.Engine === 'undefined') missing.push('Engine');
    if(typeof TBOX.Action === 'undefined') missing.push('Action');
    if(typeof TBOX.AI === 'undefined') missing.push('AI');
    if(typeof TBOX.UI === 'undefined') missing.push('UI');
    if(typeof TBOX.Audio === 'undefined') missing.push('Audio');
    if(typeof TBOX.DATA === 'undefined') missing.push('DATA');
    if(typeof TBOX.Utils === 'undefined') missing.push('Utils');
    if(typeof TBOX.Save === 'undefined') missing.push('Save');
    if(typeof TBOX.Events === 'undefined') missing.push('Events');

    if(missing.length > 0){
      throw new Error('模块加载失败: ' + missing.join(', ') + '（请检查文件是否存在/路径是否正确）');
    }

    TBOX.loadCharConfig();

    /* ★ 从 tbox_charName 读取主角名字 */
    try {
      var savedName = localStorage.getItem('tbox_charName');
      if(savedName){
        if(TBOX.DATA.CHAR) TBOX.DATA.CHAR.name = savedName;
        if(TBOX.DATA.CHAR_DEFAULT) TBOX.DATA.CHAR_DEFAULT.name = savedName;
      }
    } catch(e){}

    TBOX.Engine.init();
    TBOX.Action.buildCharacter();
    TBOX.Action.buildDummy();
    TBOX.Action.buildEnemy();
    TBOX.AI.init();
    TBOX.UI.init();
    TBOX.Audio.init();
    TBOX.NetAudio.load();

    bindInputEvents();
    bindBackOverlay();

    TBOX.Engine.player = TBOX.Player;
    TBOX.Engine.onUpdate = function(dt, now){ updatePlayer(dt, now); };
    TBOX.Engine.onUpdateAction = function(dt, now){ TBOX.Action.updatePose(dt, now, TBOX.Player); };
    TBOX.Engine.onUpdateEnemy = function(dt, now){ TBOX.AI.updateEnemy(dt, now); };
    TBOX.Engine.onUpdateFragments = function(rawDt){ TBOX.AI.update(rawDt, performance.now(), rawDt); };

    var isTouch = TBOX.Utils.isTouch();
    TBOX.Engine.isTouch = isTouch;
    try { localStorage.setItem('tbox_device', isTouch ? 'touch' : 'pc'); } catch(e){}

    var touchUI = document.getElementById('touchUI');
    var pcHud = document.getElementById('pcHud');
    var backBtn = document.getElementById('btnBackGame');
    var joyZone = document.getElementById('joyZone');
    var lookZone = document.getElementById('lookZone');

    if(isTouch){
      if(touchUI) touchUI.classList.add('on');
      if(pcHud) pcHud.style.display = 'none';
      if(joyZone) joyZone.style.pointerEvents = 'auto';
      if(lookZone) lookZone.style.pointerEvents = 'auto';
      bindTouchControls();
      bindTouchButtons();
      TBOX.Layout.init();
    } else {
      if(touchUI) touchUI.classList.remove('on');
      if(pcHud) pcHud.style.display = 'block';
      if(joyZone) joyZone.style.pointerEvents = 'none';
      if(lookZone) lookZone.style.pointerEvents = 'none';
    }

    if(backBtn) backBtn.style.display = 'flex';

    var backVersion = document.getElementById('backVersion');
    if(backVersion) backVersion.textContent = TBOX.DATA.VERSION_LABEL;

    applyLang();

    /* ★ 更新左下角主角名字 */
    if(TBOX.UI && TBOX.UI.updatePlayerName) TBOX.UI.updatePlayerName();
    var pnEl = document.getElementById('playerName');
    if(pnEl){
      var nm = (TBOX.DATA.CHAR && TBOX.DATA.CHAR.name) ? TBOX.DATA.CHAR.name : 'Player';
      pnEl.textContent = nm.toUpperCase();
    }

    TBOX.Events.on(TBOX.EVENTS.SETTING_CHANGED, function(data){
      if(data.key === 'tbox_lang') applyLang();
    });

    TBOX.Engine.start();

    if(!isTouch){
      setTimeout(function(){
        if(TBOX.Engine && TBOX.Engine.requestLock) TBOX.Engine.requestLock();
      }, 100);
      document.addEventListener('dblclick', function(){
        if(TBOX.Engine && TBOX.Engine.requestLock) TBOX.Engine.requestLock();
      });
    }

    var loading = document.getElementById('loading');
    if(loading) loading.style.display = 'none';
    console.log('T-BOX started ·', TBOX.DATA.VERSION_LABEL, '· device:', isTouch ? 'touch' : 'pc');
  } catch(err){
    console.error('TBOX_START error:', err);
    var errEl = document.getElementById('loadErr');
    var loadingEl = document.getElementById('loading');
    if(loadingEl) loadingEl.style.display = 'flex';
    if(errEl) errEl.textContent = '启动错误: ' + err.message;
  }
}

if(window.TBOX_THREE_READY){
  window.addEventListener('tbox:scripts-ready', TBOX_START, { once: true });
} else {
  window.addEventListener('tbox:three-ready', function(){
    window.TBOX_THREE_READY = true;
  }, { once: true });
  window.addEventListener('tbox:scripts-ready', TBOX_START, { once: true });
}

setTimeout(function(){
  if(!TBOX.Engine || !TBOX.Engine.running){
    console.warn('T-BOX fallback start');
    TBOX_START();
  }
}, 1500);