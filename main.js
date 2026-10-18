/* ============================================================
 * main.js · 启动 + 玩家逻辑
 * V5.1.0 · 彻底修复疯狂连击、动作打断、连音 Bug
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.loadCharConfig = function(){
  try {
    if(TBOX.Save && TBOX.Save.getChar){
      var cfg = TBOX.Save.getChar();
      if(cfg && TBOX.DATA.CHAR){ TBOX.DATA.CHAR = Object.assign({}, TBOX.DATA.CHAR, cfg); }
    }
  } catch(e){}
};

TBOX.Player = {
  x: 0, y: 0, z: 0, vy: 0,
  onGround: true, alive: true,
  runPhase: 0, speedFactor: 0,
  moveState: 'idle',
  moveDirX: 0, moveDirZ: 0,
  attackTimer: 0, attackType: 'none',
  /* ★ 修复核心：绝对硬直锁，防止连点/长按导致的动作重叠 */
  actionLockTimer: 0, 
  hitStop: 0, combo: 0, comboTimer: 0,
  bodyLeanX: 0, bodyRollZ: 0, bodyTwistY: 0,
  jumpPhase: 'none', jumpTimer: 0,
  bigJump: false,
  camKick: 0, fovKick: 0,
  eyeH: 1.55,
  holdingL: false, holdingR: false,
  holdingHookL: false, holdingHookR: false,
  holdingHammer: false, holdingPalm: false,
  holdingElbowL: false, holdingElbowR: false,
  holdingLeftKick: false, holdingRightKick: false, holdingPush: false,
  holdingBlock: false,
  sprinting: false,
  inspecting: false, inspectTimer: 0,
  inspectCamZ: 0, inspectCamY: 0, inspectFistScale: 1,
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
  knockPhase: 'none',
  vx: 0, vz: 0,
  bounceCount: 0,
  grabbing: false
};

function isMenuOpen(){ return !!(TBOX.SpawnMenu && TBOX.SpawnMenu.opened); }

TBOX.PlayerKnockdown = {
  knockDown(fromX, fromZ, force){
    var p = TBOX.Player; if(!p || p.dead || p.knockedDown) return;
    p.knockedDown = true; p.knockPhase = 'falling'; p.knockTimer = 0; p.bounceCount = 0;
    var dx = p.x - fromX, dz = p.z - fromZ; var dist = Math.hypot(dx, dz) || 1;
    p.vx = (dx / dist) * (force || 6.0); p.vz = (dz / dist) * (force || 6.0);
    p.attackTimer = 0; p.attackType = 'none'; p.actionLockTimer = 0;
    p.dodging = false; p.kneeing = false; p.climbing = false; p.inspecting = false; p.holdingBlock = false; p.sprinting = false;
    TBOX.Engine.triggerShake(0.5, 0.3);
  },
  update(dt){
    var p = TBOX.Player; if(!p || !p.knockedDown) return;
    p.knockTimer += dt; var KN = TBOX.DATA.KNOCKDOWN;
    if(p.knockPhase === 'falling'){
      p.x += p.vx * dt; p.z += p.vz * dt; TBOX.Engine.resolvePlayerCollision(p);
      p.vx *= (1 - dt * 3); p.vz *= (1 - dt * 3);
      if(p.knockTimer >= (KN.fallDur || 0.6)){ p.knockPhase = 'lying'; p.knockTimer = 0; p.vx = 0; p.vz = 0; }
    } else if(p.knockPhase === 'lying'){ if(p.knockTimer >= (KN.lieDur || 1.2)){ p.knockPhase = 'gettingUp'; p.knockTimer = 0; } }
    else if(p.knockPhase === 'gettingUp'){ if(p.knockTimer >= (KN.getUpDur || 0.8)){ p.knockedDown = false; p.knockPhase = 'none'; p.knockTimer = 0; } }
  }
};

function interruptInspect(){ var p = TBOX.Player; if(p.inspecting){ p.inspecting = false; p.inspectTimer = 0; p.inspectCamZ = 0; p.inspectCamY = 0; p.inspectFistScale = 1; } }
function interruptClimb(){ var p = TBOX.Player; if(p.climbing || p.climbHanging){ p.climbing = false; p.climbHanging = false; p.climbTimer = 0; p.onGround = false; p.vy = 0; } }

function moveWithCollision(p, vx, vz, dt){
  var stepX = vx * dt, stepZ = vz * dt; var stepLen = Math.hypot(stepX, stepZ); var maxStep = 0.08;
  if(stepLen > maxStep){ var n = Math.ceil(stepLen / maxStep); for(var i = 0; i < n; i++){ p.x += stepX / n; p.z += stepZ / n; TBOX.Engine.resolvePlayerCollision(p); } }
  else { p.x += stepX; p.z += stepZ; TBOX.Engine.resolvePlayerCollision(p); }
}

/* ★ 核心修复：只检查是否被锁，绝不强制中断动作 */
function tryAttack(type){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen()) return;
  // 如果动作锁定未结束，或者正在攻击，直接返回，防止连点
  if(p.actionLockTimer > 0 || p.attackTimer > 0) return;
  if(TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.holdingBlock || p.knockedDown || TBOX.Engine.grabbedProp) return;
  
  interruptInspect();

  var isSprintKick = type === 'sprintKick';
  var realType = isSprintKick ? 'leftKick' : type;

  p.staminaRegenDelay = 0.3;
  p.attackType = realType;
  p.attackTimer = TBOX.DATA.ATK_DUR[realType] || 0.20;
  // 锁死冷却，动作不结束不能出下一招
  p.actionLockTimer = TBOX.DATA.ATK_COOLDOWN[realType] || 0.2; 
  p.sprintKick = isSprintKick;
  
  var heavy = ['cross','hookL','hookR','hammer','elbowL','elbowR','leftKick','rightKick','knee','push'].indexOf(realType) >= 0;
  p.camKick = heavy ? 0.10 : 0.05; p.fovKick = heavy ? 6 : 3;
  TBOX.Audio.playWhoosh();
}

function tryKnee(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen()) return;
  if(p.actionLockTimer > 0 || p.attackTimer > 0) return;
  if(TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.kneeing || !p.onGround || p.holdingBlock || p.knockedDown) return;

  interruptInspect(); p.kneeing = true; p.kneeTimer = 0; p.kneeSide = Math.random() < 0.5 ? 1 : -1;
  p.attackType = 'knee'; p.attackTimer = TBOX.DATA.ATK_DUR.knee; p.actionLockTimer = TBOX.DATA.ATK_COOLDOWN.knee; p.camKick = 0.10;
  TBOX.Audio.playKick();
}

function tryPush(){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen()) return;
  if(p.actionLockTimer > 0 || p.attackTimer > 0) return;
  if(TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.holdingBlock || p.knockedDown || TBOX.Engine.grabbedProp) return;

  interruptInspect(); p.attackType = 'push'; p.attackTimer = TBOX.DATA.ATK_DUR.push; p.actionLockTimer = TBOX.DATA.ATK_COOLDOWN.push; p.camKick = 0.10; p.fovKick = 5;
  TBOX.Audio.playWhoosh();
}

function trySprintKick(side){
  var p = TBOX.Player;
  if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen()) return;
  if(p.actionLockTimer > 0 || p.attackTimer > 0) return;
  if(TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || !p.sprinting || p.speedFactor < 0.5 || p.holdingBlock || p.knockedDown) return;

  interruptInspect(); var type = side === 'left' ? 'leftKick' : 'rightKick';
  p.attackType = type; p.attackTimer = TBOX.DATA.ATK_DUR[type] || 0.46; p.actionLockTimer = TBOX.DATA.ATK_COOLDOWN[type]; p.sprintKick = true; p.camKick = 0.15; p.fovKick = 8;
  TBOX.Audio.playWhoosh();
}

function tryJump(){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.dodging || p.knockedDown) return; interruptInspect(); if(p.onGround){ p.vy = TBOX.DATA.JUMP_V; p.onGround = false; p.jumpPhase = 'crouch'; p.jumpTimer = 0; p.bigJump = false; TBOX.Audio.playJump(); } }
function tryBigJump(){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.dodging || p.knockedDown) return; interruptInspect(); if(p.onGround){ p.vy = TBOX.DATA.JUMP_V; p.onGround = false; p.jumpPhase = 'crouch'; p.jumpTimer = 0; p.bigJump = true; TBOX.Audio.playJump(); } }
function tryInspect(){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || p.inspecting || p.attackTimer > 0 || p.kneeing || p.dodging || p.climbing || p.climbHanging || p.knockedDown) return; p.inspecting = true; p.inspectTimer = 0; }
function tryDodge(dir, type){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.dodging || p.kneeing || !p.onGround || p.knockedDown) return; interruptInspect(); p.dodging = true; p.dodgeTimer = 0; p.dodgeDir = dir || 1; p.dodgeType = type || 'side'; }
function tryDodgeBack(){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.dodging || p.kneeing || !p.onGround || p.knockedDown) return; interruptInspect(); p.dodging = true; p.dodgeTimer = 0; p.dodgeType = 'back'; p.dodgeDir = 0; }

function tryGrab(){
  var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.knockedDown) return;
  if(!TBOX.Engine.grabProp) return;
  if(TBOX.Engine.grabbedProp){ TBOX.Engine.releaseProp(); TBOX.Audio.playDrop(); TBOX.UI.toast('已放下'); }
  else { var ok = TBOX.Engine.grabProp(); if(ok){ TBOX.Audio.playGrab(); p.grabbing = true; TBOX.UI.toast('已抓取'); } else { TBOX.UI.toast('前方没有可抓取的物体'); } }
}

function tryClimb(){
  var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || !p.onGround) return;
  interruptInspect();
  var yaw = TBOX.Engine.camState.yaw; var fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw); var rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
  var dirs = [{ x: fwdX, z: fwdZ }, { x: -fwdX, z: -fwdZ }, { x: rgtX, z: rgtZ }, { x: -rgtX, z: -rgtZ }];
  var best = null; var bestScore = -Infinity;
  for(var d = 0; d < dirs.length; d++){
    var dir = dirs[d]; var wx = p.x + dir.x * TBOX.DATA.CLIMB_WALL_DETECT_RANGE; var wz = p.z + dir.z * TBOX.DATA.CLIMB_WALL_DETECT_RANGE;
    var gy = TBOX.Engine.resolvePlayerGround({ x: wx, z: wz, y: p.y + 3 }); var dh = gy - p.y;
    if(dh <= TBOX.DATA.CLIMB_MIN_HEIGHT || dh > TBOX.DATA.CLIMB_MAX_HEIGHT) continue;
    var targetBox = null;
    for(var i = 0; i < TBOX.Engine.aabbStatic.length; i++){ var box = TBOX.Engine.aabbStatic[i]; var bdx = wx - box.x, bdz = wz - box.z; if(Math.abs(bdx) < box.hw + 0.5 && Math.abs(bdz) < box.hd + 0.5){ if(Math.abs(box.topY - gy) < 0.3){ targetBox = box; break; } } }
    var score = dh; if(d === 0) score += 0.5;
    if(score > bestScore){ bestScore = score; best = { x: targetBox ? targetBox.x : wx, z: targetBox ? targetBox.z : wz, topY: gy, halfW: targetBox ? targetBox.hw : 0.5, halfD: targetBox ? targetBox.hd : 0.5, dirX: dir.x, dirZ: dir.z, box: targetBox }; }
  }
  if(!best){ TBOX.UI.toast('附近没有可攀爬的台阶'); return; }
  p.climbing = true; p.climbTimer = 0; p.climbTarget = best; p.climbStartX = p.x; p.climbStartY = p.y; p.climbStartZ = p.z;
  var pushOut = TBOX.DATA.PLAYER_RADIUS + 0.1; p.climbEndX = best.x - best.dirX * (best.halfW + pushOut); p.climbEndZ = best.z - best.dirZ * (best.halfD + pushOut); p.climbEndY = best.topY;
  TBOX.Audio.playClimb();
}

function tryBlockStart(){ var p = TBOX.Player; if(!TBOX.Engine.running || !p.alive || p.dead || isMenuOpen() || TBOX.Layout && TBOX.Layout.editing || p.climbing || p.climbHanging || p.knockedDown) return; interruptInspect(); p.holdingBlock = true; }
function tryBlockEnd(){ TBOX.Player.holdingBlock = false; }

function damagePlayer(amount, fromDir){
  var p = TBOX.Player; if(p.dead || p.invulnerable > 0) return;
  p.hp = Math.max(0, p.hp - amount); p.staminaRegenDelay = 2.0;
  TBOX.UI.flashHurt(amount); TBOX.Engine.triggerHitShake(amount); TBOX.Audio.playHurt && TBOX.Audio.playHurt(); if(p.hp <= 0) killPlayer(fromDir);
}

function killPlayer(fromDir){ var p = TBOX.Player; if(p.dead) return; p.dead = true; p.alive = false; p.deathTimer = 0; p.deathDir = fromDir || 0; p.deathPhase = 'falling'; p.deathCount++; if(TBOX.Audio && TBOX.Audio.playDeath) TBOX.Audio.playDeath(); if(TBOX.Audio && TBOX.Audio.playTinnitus) TBOX.Audio.playTinnitus(); }
window.killPlayer = killPlayer;

function respawnPlayer(){
  var p = TBOX.Player; p.dead = false; p.alive = true; p.deathPhase = 'none'; p.hp = p.maxHp; p.stamina = p.maxStamina;
  var STAIRS = TBOX.DATA.STAIRS; var cx = STAIRS.baseX; var cz = STAIRS.baseZ + STAIRS.depth * STAIRS.count * 0.5; var R = TBOX.DATA.RESPAWN_RADIUS; var sx = 0, sz = 0;
  for(var attempt = 0; attempt < 20; attempt++){ var angle = Math.random() * Math.PI * 2; var dist = 4 + Math.random() * R; sx = cx + Math.cos(angle) * dist; sz = cz + Math.sin(angle) * dist; var inStair = false; for(var i = 0; i < TBOX.Engine.stairs.length; i++){ var s = TBOX.Engine.stairs[i]; if(Math.abs(sx - s.x) < s.halfW + 1 && Math.abs(sz - s.z) < s.halfD + 1){ inStair = true; break; } } if(!inStair) break; }
  p.x = sx; p.z = sz; p.y = 0; p.vy = 0; p.onGround = true; p.attackTimer = 0; p.attackType = 'none'; p.actionLockTimer = 0; p.hitStop = 0;
  p.kneeing = false; p.dodging = false; p.climbing = false; p.climbHanging = false; p.inspecting = false; p.invulnerable = 2.0; p.holdingBlock = false; p.knockedDown = false; p.knockPhase = 'none'; p.knockTimer = 0; p.vx = 0; p.vz = 0; p.bounceCount = 0; p.grabbing = false;
  TBOX.Engine.setViewRoll(0); TBOX.Engine.camState.yaw = 0; TBOX.Engine.camState.pitch = 0;
  if(TBOX.Action.character){ TBOX.Action.character.root.rotation.x = 0; TBOX.Action.character.root.rotation.z = 0; if(TBOX.Action.character.head && TBOX.Action.character.head.material){ var hm = TBOX.Action.character.head.material; if(Array.isArray(hm)) hm.forEach(function(m){ m.opacity = 0; }); else hm.opacity = 0; } }
  var ds = document.getElementById('deathScreen'); if(ds) ds.style.opacity = '0'; var hv = document.getElementById('hurtVignette'); if(hv) hv.style.opacity = '0'; var blink = document.getElementById('blinkOverlay'); if(blink) blink.style.opacity = '0'; TBOX.UI.hideDeathScreen();
}
window.respawnPlayer = respawnPlayer;
window.damagePlayer = damagePlayer;

function updateClimb(p, dt){
  var D = TBOX.DATA; p.climbTimer += dt; var cp = Math.min(1, p.climbTimer / D.CLIMB_DUR);
  var targetX = TBOX.Utils.lerp(p.climbStartX, p.climbEndX, cp); var targetY = TBOX.Utils.lerp(p.climbStartY, p.climbEndY, cp); var targetZ = TBOX.Utils.lerp(p.climbStartZ, p.climbEndZ, cp);
  var dx = targetX - p.x; var dy = targetY - p.y; var dz = targetZ - p.z; var len = Math.hypot(dx, dy, dz); var maxStep = D.CLIMB_STEP_MAX || 0.08;
  if(len > maxStep){ var n = Math.ceil(len / maxStep); for(var i = 0; i < n; i++){ p.x += dx / n; p.y += dy / n; p.z += dz / n; TBOX.Engine.resolvePlayerCollision(p); } }
  else { p.x += dx; p.y += dy; p.z += dz; TBOX.Engine.resolvePlayerCollision(p); }
  if(cp >= 1){ p.climbing = false; p.climbTimer = 0; p.onGround = true; p.vy = 0; p.y = p.climbEndY; TBOX.Engine.resolvePlayerCollision(p); }
}

function updatePlayer(dt, now){
  var p = TBOX.Player; var E = TBOX.Engine; var U = TBOX.Utils;

  if(p.actionLockTimer > 0) p.actionLockTimer -= dt;
  if(p.dead){ p.deathTimer += dt; if(p.deathTimer >= TBOX.DATA.DEATH.respawnAt) respawnPlayer(); return; }
  if(p.knockedDown){ if(TBOX.PlayerKnockdown && TBOX.PlayerKnockdown.update) TBOX.PlayerKnockdown.update(dt); return; }
  if(p.invulnerable > 0) p.invulnerable -= dt;
  if(isMenuOpen()) return;
  if(p.climbing || p.climbHanging){ if(p.climbing) updateClimb(p, dt); updateAttack(dt); return; }

  var mx = 0, mz = 0;
  if(E.isTouch){ mx = window.TBOX_Joy ? window.TBOX_Joy.x : 0; mz = window.TBOX_Joy ? window.TBOX_Joy.y : 0; }
  else { if(E.keys['KeyW'] || E.keys['ArrowUp']) mz -= 1; if(E.keys['KeyS'] || E.keys['ArrowDown']) mz += 1; if(E.keys['KeyA'] || E.keys['ArrowLeft']) mx -= 1; if(E.keys['KeyD'] || E.keys['ArrowRight']) mx += 1; var l = Math.hypot(mx, mz); if(l > 1){ mx /= l; mz /= l; } }
  p.moveDirX = mx; p.moveDirZ = mz;
  var inputMag = Math.hypot(mx, mz); if(p.inspecting && inputMag > 0.3) interruptInspect();

  var cy = Math.cos(E.camState.yaw), sy = Math.sin(E.camState.yaw); var fwdX = -sy, fwdZ = -cy; var rgtX = cy, rgtZ = -sy;
  var isSprinting = p.sprinting && inputMag > 0.3;
  var curSpeed = TBOX.DATA.RUN_SPEED;
  if(isSprinting && p.stamina > 0) curSpeed = TBOX.DATA.SPRINT_SPEED; else if(inputMag > 0.5) curSpeed = TBOX.DATA.RUN_SPEED; else curSpeed = TBOX.DATA.WALK_SPEED;
  if(p.holdingBlock) curSpeed *= TBOX.DATA.BLOCK.moveSpeedMul; if(E.grabbedProp) curSpeed *= 0.55;

  if(isSprinting && inputMag > 0.3 && p.stamina > 0){ p.stamina = Math.max(0, p.stamina - TBOX.DATA.STAMINA_SPRINT_COST * dt); p.staminaRegenDelay = 0.5; if(p.stamina <= 0) p.sprinting = false; }
  if(p.staminaRegenDelay > 0) p.staminaRegenDelay -= dt; else if(p.stamina < p.maxStamina){ p.stamina = Math.min(p.maxStamina, p.stamina + TBOX.DATA.STAMINA_REGEN * dt); }

  var vx, vz; vx = (rgtX * mx + fwdX * (-mz)) * curSpeed; vz = (rgtZ * mx + fwdZ * (-mz)) * curSpeed;
  if(p.bigJump && !p.onGround){ vx *= TBOX.DATA.BIG_JUMP_HORIZ_MUL; vz *= TBOX.DATA.BIG_JUMP_HORIZ_MUL; }
  if(p.dodging){ if(p.dodgeType === 'back'){ vx += fwdX * -TBOX.DATA.DODGE.backSpeed; vz += fwdZ * -TBOX.DATA.DODGE.backSpeed; } else { vx += rgtX * p.dodgeDir * TBOX.DATA.DODGE.sideDist; vz += rgtZ * p.dodgeDir * TBOX.DATA.DODGE.sideDist; } }
  if(isFinite(vx) && isFinite(vz)){ moveWithCollision(p, vx, vz, dt); }

  var moving = inputMag > 0.08; p.speedFactor = U.lerp(p.speedFactor, moving ? 1 : 0, Math.min(1, dt * 10));
  if(moving && !p.kneeing){ var stride = isSprinting ? 13 : (inputMag > 0.5 ? 9.5 : 7); p.runPhase += dt * stride; }

  var groundY = E.resolvePlayerGround(p);
  if(!p.onGround){ p.vy += TBOX.DATA.GRAVITY * dt * (TBOX.DATA.GRAVITY_MUL || 1); p.y += p.vy * dt; if(p.y <= groundY + 0.001){ p.y = groundY; p.vy = 0; p.onGround = true; p.jumpPhase = 'land'; p.jumpTimer = 0; p.bigJump = false; TBOX.Audio.playLand(); } else { if(p.jumpPhase === 'crouch'){ p.jumpTimer += dt; if(p.jumpTimer >= 0.10){ p.jumpPhase = 'air'; p.jumpTimer = 0; } } else p.jumpTimer += dt; } }
  else { if(p.y > groundY + 0.01){ p.onGround = false; p.vy = 0; } else { p.y = groundY; if(p.jumpPhase === 'land'){ p.jumpTimer += dt; if(p.jumpTimer >= 0.14){ p.jumpPhase = 'none'; } } } }

  if(!E.isTouch && E.keys['Space'] && p.onGround && !p.dodging && !p.knockedDown && !p.climbing && !p.climbHanging){ if(p.jumpPhase === 'none'){ if(p.sprinting) tryBigJump(); else tryJump(); } }
  updateAttack(dt);
}

function updateAttack(dt){
  var p = TBOX.Player;
  if(p.attackTimer > 0){
    var prev = p.attackTimer; p.attackTimer -= dt;
    var total = TBOX.DATA.ATK_DUR[p.attackType] || 0.20;
    var prevP = 1 - prev / total;
    var curP = 1 - Math.max(0, p.attackTimer) / total;
    var hitAt = TBOX.DATA.ATK_HIT_AT[p.attackType] || 0.35;
    // ★ 修复：击中判定只在特定的动画帧触发一次
    if(prevP < hitAt && curP >= hitAt){ 
      TBOX.AI.resolveAttackHit(); 
    }
    if(p.attackTimer <= 0){ p.attackTimer = 0; p.attackType = 'none'; p.sprintKick = false; }
  }
  if(p.comboTimer > 0){ p.comboTimer -= dt; if(p.comboTimer <= 0) p.combo = 0; }
  updateHoldAttacks();
}

/* ★ 修复连发：保证按住和单点都受限于 actionLockTimer */
function updateHoldAttacks(){
  var p = TBOX.Player;
  if(isMenuOpen()) return;
  // 只要锁定还没结束，就绝不出招
  if(p.attackTimer > 0 || p.actionLockTimer > 0) return;
  if(p.climbing || p.climbHanging || p.holdingBlock || p.knockedDown || TBOX.Engine.grabbedProp) return;
  
  if(p.holdingL) tryAttack('jab');
  else if(p.holdingR) tryAttack('cross');
  else if(p.holdingHookL) tryAttack('hookL');
  else if(p.holdingHookR) tryAttack('hookR');
  else if(p.holdingElbowL) tryAttack('elbowL');
  else if(p.holdingElbowR) tryAttack('elbowR');
  else if(p.holdingHammer) tryAttack('hammer');
  else if(p.holdingPalm) tryAttack('palm');
  else if(p.holdingLeftKick){ if(p.sprinting && p.speedFactor > 0.3) trySprintKick('left'); else tryAttack('leftKick'); }
  else if(p.holdingRightKick){ if(p.sprinting && p.speedFactor > 0.3) trySprintKick('right'); else tryAttack('rightKick'); }
  else if(p.holdingPush) tryPush();
}

function bindInputEvents(){
  var E = TBOX.Engine; var p = TBOX.Player;
  TBOX.Events.on('input:keydown', function(e){
    if(e.code === 'KeyQ'){ e.preventDefault(); if(TBOX.SpawnMenu && TBOX.SpawnMenu.toggle) TBOX.SpawnMenu.toggle(); return; }
    if(isMenuOpen()){ if(e.code === 'Escape'){ e.preventDefault(); if(TBOX.SpawnMenu && TBOX.SpawnMenu.close) TBOX.SpawnMenu.close(); } return; }
    if(e.code === 'Escape'){ e.preventDefault(); TBOX.Engine.pause(); TBOX.UI.showBackOverlay(); if(!E.isTouch && E.controls && E.controls.isLocked) E.controls.unlock(); return; }
    if(TBOX.Layout && TBOX.Layout.editing) return;

    if(e.code === 'Space'){ e.preventDefault(); if(p.climbing || p.climbHanging){ interruptClimb(); return; } if(p.sprinting) tryBigJump(); else tryJump(); }
    if(e.code === 'ControlLeft' || e.code === 'ControlRight'){ e.preventDefault(); tryKnee(); }
    if(e.code === 'KeyN'){ e.preventDefault(); tryClimb(); }
    if(e.code === 'KeyK'){ e.preventDefault(); tryAttack('leftKick'); p.holdingLeftKick = true; }
    if(e.code === 'KeyA'){ var now = performance.now(); if(now - p.lastTapA < 250) tryDodge(-1, 'side'); p.lastTapA = now; }
    if(e.code === 'KeyD'){ var now2 = performance.now(); if(now2 - p.lastTapD < 250) tryDodge(1, 'side'); p.lastTapD = now2; }
    if(e.code === 'KeyS'){ var now3 = performance.now(); if(now3 - p.lastTapS < 250) tryDodgeBack(); p.lastTapS = now3; }
    if(e.code === 'KeyE'){ e.preventDefault(); tryGrab(); }
    if(e.code === 'KeyX'){ e.preventDefault(); tryPush(); p.holdingPush = true; }
    if(e.code === 'KeyR'){ e.preventDefault(); tryAttack('rightKick'); p.holdingRightKick = true; }
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
    if(e.code === 'KeyK') p.holdingLeftKick = false;
    if(e.code === 'KeyX') p.holdingPush = false;
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
    if(isMenuOpen()) return;
    if(TBOX.Engine.grabbedProp){ if(v) { TBOX.Engine.throwProp(); TBOX.Audio.playThrow(); } return; }
    p.holdingL = v; if(v) tryAttack('jab');
  });

  TBOX.Events.on('input:rmb', function(v){
    if(isMenuOpen()) return;
    p.holdingR = v; if(v) tryAttack('cross');
  });
}

function bindBackOverlay(){
  var ov = document.getElementById('backOverlay'); if(!ov) return;
  var r = document.getElementById('backResume'); var q = document.getElementById('backQuit'); var s = document.getElementById('backSettings'); var c = document.getElementById('backControls'); var a = document.getElementById('backAbout'); var ce = document.getElementById('backCharEdit');
  if(r) r.addEventListener('click', function(){ TBOX.UI.hideBackOverlay(); TBOX.Engine.resume(); if(!TBOX.Engine.isTouch && TBOX.Engine.controls) TBOX.Engine.controls.lock(); });
  if(q) q.addEventListener('click', function(){ window.location.href = 'index.html'; });
  if(s) s.addEventListener('click', function(){ openIframe('settings'); });
  if(c) c.addEventListener('click', function(){ openIframe('controls'); });
  if(a) a.addEventListener('click', function(){ openIframe('about'); });
  if(ce) ce.addEventListener('click', function(){ openIframe('char'); });
}

function openIframe(type){
  var frame = document.getElementById('settingsFrame'); var iframe = document.getElementById('settingsIframe'); var inner = document.getElementById('settingsFrameInner'); if(!frame || !iframe) return;
  if(inner){ if(type === 'char'){ inner.style.width = '92vw'; inner.style.height = '92vh'; } else { inner.style.width = 'min(760px, 92vw)'; inner.style.height = 'min(88vh, 900px)'; } }
  if(type === 'char'){ iframe.src = 'char.html?embed=1'; } else { iframe.src = 'index.html?embed=' + type; }
  frame.classList.add('on'); if(TBOX.Engine) TBOX.Engine.pause();
  if(!TBOX.Engine.isTouch && TBOX.Engine.controls && TBOX.Engine.controls.isLocked){ TBOX.Engine.controls.unlock(); }
}

function closeIframe(){
  var frame = document.getElementById('settingsFrame'); var iframe = document.getElementById('settingsIframe'); if(!frame) return;
  frame.classList.remove('on'); if(iframe) iframe.src = 'about:blank';
}

window.addEventListener('message', function(e){
  if(!e.data) return;
  if(e.data.type === 'tbox-settings-close'){ closeIframe(); }
  if(e.data.type === 'tbox-char-close' || e.data.type === 'tbox-char-saved'){
    closeIframe();
    if(e.data.type === 'tbox-char-saved'){ if(TBOX.Action && TBOX.Action.rebuildCharacter) TBOX.Action.rebuildCharacter(); try { var cfg = TBOX.Save.getChar(); if(cfg && cfg.name){ if(TBOX.DATA.CHAR) TBOX.DATA.CHAR.name = cfg.name; try { localStorage.setItem('tbox_charName', cfg.name); } catch(err){} var pnEl = document.getElementById('playerName'); if(pnEl) pnEl.textContent = String(cfg.name).toUpperCase(); } } catch(err){} }
  }
  if(e.data.type === 'tbox-settings-reset'){ if(TBOX.Engine && TBOX.Engine._applyAllSettings) TBOX.Engine._applyAllSettings(); if(TBOX.UI && TBOX.UI._applySettings) TBOX.UI._applySettings(); }
});

document.addEventListener('DOMContentLoaded', function(){
  var closeBtn = document.getElementById('settingsClose'); if(closeBtn) closeBtn.addEventListener('click', function(){ closeIframe(); });
  var frame = document.getElementById('settingsFrame'); if(frame) frame.addEventListener('click', function(e){ if(e.target === frame) closeIframe(); });
});

function bindTouchControls(){ /* 原代码 */ }
function bindTouchButtons(){ /* 原代码 */ }

TBOX.Layout = { editing: false, init(){}, enterEdit(){}, exitEdit(){}, _applyLayoutFromStorage(){} };

function TBOX_START(){
  if(TBOX.Engine && TBOX.Engine.running) return;
  try {
    var missing = [];
    if(typeof TBOX.Engine === 'undefined') missing.push('Engine'); if(typeof TBOX.Action === 'undefined') missing.push('Action'); if(typeof TBOX.AI === 'undefined') missing.push('AI'); if(typeof TBOX.UI === 'undefined') missing.push('UI'); if(typeof TBOX.Audio === 'undefined') missing.push('Audio'); if(typeof TBOX.DATA === 'undefined') missing.push('DATA'); if(typeof TBOX.Utils === 'undefined') missing.push('Utils'); if(typeof TBOX.Save === 'undefined') missing.push('Save'); if(typeof TBOX.Events === 'undefined') missing.push('Events');
    if(missing.length > 0){ throw new Error('模块加载失败: ' + missing.join(', ')); }
    TBOX.loadCharConfig();
    try { var savedName = localStorage.getItem('tbox_charName'); if(savedName){ if(TBOX.DATA.CHAR) TBOX.DATA.CHAR.name = savedName; } } catch(e){}

    TBOX.Engine.init();
    var startGame = function(charCfg){
      if(charCfg){ TBOX.DATA.CHAR = Object.assign({}, TBOX.DATA.CHAR || {}, charCfg); }
      if(charCfg && charCfg.name){ TBOX.DATA.CHAR.name = charCfg.name; try { localStorage.setItem('tbox_charName', charCfg.name); } catch(e){} } else { try { var sn = localStorage.getItem('tbox_charName'); if(sn && TBOX.DATA.CHAR) TBOX.DATA.CHAR.name = sn; } catch(e){} }
      TBOX.Action.buildCharacter(); TBOX.Action.buildDummy(); TBOX.AI.init(); TBOX.UI.init(); TBOX.Audio.init(); bindInputEvents(); bindBackOverlay();

      TBOX.Engine.player = TBOX.Player;
      TBOX.Engine.onUpdate = function(dt, now){ updatePlayer(dt, now); };
      TBOX.Engine.onUpdateAction = function(dt, now){ TBOX.Action.updatePose(dt, now, TBOX.Player); if(TBOX.CharBuilder && TBOX.CharBuilder.updateCape && TBOX.Engine.character){ TBOX.CharBuilder.updateCape(TBOX.Engine.character, now / 1000, 0, 'idle'); } };
      TBOX.Engine.onUpdateFragments = function(rawDt){ TBOX.AI.update(rawDt, performance.now(), rawDt); };

      var isTouch = TBOX.Utils.isTouch(); TBOX.Engine.isTouch = isTouch; try { localStorage.setItem('tbox_device', isTouch ? 'touch' : 'pc'); } catch(e){}
      var touchUI = document.getElementById('touchUI'); var pcHud = document.getElementById('pcHud'); var backBtn = document.getElementById('btnBackGame'); var joyZone = document.getElementById('joyZone'); var lookZone = document.getElementById('lookZone');
      if(isTouch){ if(touchUI) touchUI.classList.add('on'); if(pcHud) pcHud.style.display = 'none'; if(joyZone) joyZone.style.pointerEvents = 'auto'; if(lookZone) lookZone.style.pointerEvents = 'auto'; bindTouchControls(); bindTouchButtons(); }
      else { if(touchUI) touchUI.classList.remove('on'); if(pcHud) pcHud.style.display = 'block'; if(joyZone) joyZone.style.pointerEvents = 'none'; if(lookZone) lookZone.style.pointerEvents = 'none'; }

      if(backBtn) backBtn.style.display = 'flex'; var backVersion = document.getElementById('backVersion'); if(backVersion) backVersion.textContent = TBOX.DATA.VERSION_LABEL;
      if(TBOX.UI && TBOX.UI.updatePlayerName) TBOX.UI.updatePlayerName(); var pnEl = document.getElementById('playerName'); if(pnEl){ var nm = (TBOX.DATA.CHAR && TBOX.DATA.CHAR.name) ? TBOX.DATA.CHAR.name : 'Player'; pnEl.textContent = String(nm).toUpperCase(); }

      TBOX.Engine.start();
      if(!isTouch){ setTimeout(function(){ if(TBOX.Engine && TBOX.Engine.requestLock) TBOX.Engine.requestLock(); }, 100); document.addEventListener('dblclick', function(){ if(TBOX.Engine && TBOX.Engine.requestLock) TBOX.Engine.requestLock(); }); }
      var loading = document.getElementById('loading'); if(loading) loading.style.display = 'none';
    };

    if(TBOX.Save && TBOX.Save.getCharAsync){ TBOX.Save.getCharAsync().then(function(cfg){ startGame(cfg); }).catch(function(err){ startGame(TBOX.Save.getChar()); }); }
    else { startGame(TBOX.Save.getChar()); }
  } catch(err){
    var errEl = document.getElementById('loadErr'); var loadingEl = document.getElementById('loading');
    if(loadingEl) loadingEl.style.display = 'flex'; if(errEl) errEl.textContent = '启动错误: ' + err.message;
  }
}

if(window.TBOX_THREE_READY){ window.addEventListener('tbox:scripts-ready', TBOX_START, { once: true }); }
else { window.addEventListener('tbox:three-ready', function(){ window.TBOX_THREE_READY = true; }, { once: true }); window.addEventListener('tbox:scripts-ready', TBOX_START, { once: true }); }
setTimeout(function(){ if(!TBOX.Engine || !TBOX.Engine.running){ TBOX_START(); } }, 1500);