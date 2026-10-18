/* ============================================================
 * data.js · 数据系统
 * V4.0.0 · 新增星形/截锥 + 真实伤害 + 极简去重
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.DATA = {
  VERSION: (window.TBOX.VERSION && window.TBOX.VERSION.NUMBER) || '1.0.0',
  VERSION_LABEL: (window.TBOX.VERSION && window.TBOX.VERSION.LABEL) || 'V1.0.0 · STABLE',
  BUILD: (window.TBOX.VERSION && window.TBOX.VERSION.BUILD) || 100,

  EYE_H: 1.55,
  PLAYER_RADIUS: 0.35,
  PLAYER_HEIGHT: 1.60,
  PLAYER_MASS: 70,
  WALK_SPEED: 2.8,
  RUN_SPEED: 5.5,
  SPRINT_SPEED: 8.5,
  GRAVITY: -26,
  GRAVITY_MUL: 1.0,
  JUMP_V: 9.0,
  BIG_JUMP_HORIZ_MUL: 3.0,
  CAM_FWD_OFFSET: 0.10,
  CAM_HEIGHT_OFFSET: 0.0,
  CAM_SHOULDER_OFFSET: 0.0,
  PITCH_MIN: -1.25,
  PITCH_MAX: 1.40,
  TPS_TRANSITION: 0.30,

  VIEW_SWAY: { ampX: 0.006, ampY: 0.008, speedIdle: 0.4, speedWalk: 1.0, speedRun: 1.8, speedSprint: 2.4, breathAmp: 0.010, breathSpeed: 1.5 },
  RUN_SHAKE: { walkAmp: 0.012, runAmp: 0.022, sprintAmp: 0.035, speed: 12 },
  VIEW_SHAKE: { hitAmpSmall: 0.20, hitAmpMid: 0.45, hitAmpLarge: 0.70, hitTimeSmall: 0.10, hitTimeMid: 0.18, hitTimeLarge: 0.28, attackAmp: 0.06, attackTime: 0.08 },

  ARM_SHOULDER_X: 0.22,
  ARM_SHOULDER_Y: 1.34,
  ARM_SHOULDER_Z: 0.03,
  ARM_BASE_Z_ROT: 0.06,

  ATTACK_RANGE: 1.9,
  TARGET_HP: 10,

  /* ★ 真实伤害与冷却（新） */
  ATK_DUR: {
    jab: 0.22, cross: 0.28, hookL: 0.35, hookR: 0.35,
    hammer: 0.45, palm: 0.25, elbowL: 0.30, elbowR: 0.30,
    leftKick: 0.50, rightKick: 0.50, push: 0.35, knee: 0.45
  },
  ATK_DMG: {
    jab: 2, cross: 4, hookL: 5, hookR: 5,
    hammer: 6, palm: 2, elbowL: 4, elbowR: 4,
    leftKick: 7, rightKick: 7, push: 0, knee: 8
  },
  ATK_COOLDOWN: {
    jab: 0.15, cross: 0.20, hookL: 0.25, hookR: 0.25,
    hammer: 0.35, palm: 0.15, elbowL: 0.25, elbowR: 0.25,
    leftKick: 0.40, rightKick: 0.40, push: 0.30, knee: 0.35
  },
  ATK_HIT_AT: {
    jab: 0.30, cross: 0.30, hookL: 0.35, hookR: 0.35,
    hammer: 0.40, palm: 0.25, elbowL: 0.30, elbowR: 0.30,
    leftKick: 0.40, rightKick: 0.40, push: 0.30, knee: 0.35
  },

  SPRINT_ATK: { kickMul: 6.0, kickKnockBack: 12.0, pushMul: 1.75, pushForce: 14.0 },
  KICK_FLY: { enable: true, maxDistance: 3.0, flySpeed: 14.0, flyUp: 3.5, gravity: -22, friction: 3.5, minDmgForFly: 3 },
  HIT_PART: { headMinY: 1.45, headMaxY: 1.75, armMinY: 1.10, armMaxY: 1.45, bodyMinY: 0.85, bodyMaxY: 1.45, legMinY: 0.0, legMaxY: 0.85 },

  PHYSICS: {
    enable: true, gravity: -22, friction: 4.0, airFriction: 0.5, restitution: 0.15,
    sleepSpeed: 0.05, sleepTime: 0.5, maxProps: 300, propCollision: true, collideStairs: true,
    playerPush: true, playerPushForce: 6.0, grabFollowLambda: 20, playerMass: 70,
    minImpulseMass: 0.5, maxPushMass: 20, gravityScale: 1.0
  },

  GRAB: {
    enable: true, range: 3.2, holdDistance: 1.5, holdHeight: 1.3, holdHandOffset: 0.15,
    throwSpeed: 12.0, grabKey: 'KeyE', throwKey: 'Mouse0', facePlayer: true,
    maxMass: 15, windupTime: 0.25, releaseTime: 0.15
  },

  ATTACK_PUSH: { enable: true, force: 8.0, upForce: 1.5, range: 2.0, massFalloff: 0.85 },

  /* ★ 生成物质量与碰撞箱（适配新形状） */
  COLLISION: {
    'cube':             { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.0 },
    'cuboid':           { type: 'box', w: 1.6, h: 0.8, d: 1.0, mass: 1.2 },
    'tetrahedron':      { type: 'sphere', r: 0.45, mass: 0.8 },
    'octahedron':       { type: 'sphere', r: 0.45, mass: 0.8 },
    'dodecahedron':     { type: 'sphere', r: 0.45, mass: 1.0 },
    'icosahedron':      { type: 'sphere', r: 0.45, mass: 0.9 },
    'sphere':           { type: 'sphere', r: 0.5, mass: 0.9 },
    'hemisphere':       { type: 'sphere', r: 0.5, mass: 0.6 },
    'quarter-sphere':   { type: 'sphere', r: 0.5, mass: 0.4 },
    'capsule':          { type: 'box', w: 0.7, h: 1.0, d: 0.7, mass: 0.9 },
    'dome':             { type: 'sphere', r: 0.5, mass: 1.2 },
    
    'prism3':           { type: 'box', w: 0.9, h: 1.0, d: 0.9, mass: 0.9 },
    'prism4':           { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.0 },
    'prism5':           { type: 'box', w: 0.95, h: 1.0, d: 0.95, mass: 1.0 },
    'prism6':           { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.1 },
    'prism8':           { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.2 },
    'prism12':          { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.4 },
    'prism16':          { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.5 },

    'pyramid3':         { type: 'box', w: 0.9, h: 1.0, d: 0.9, mass: 0.7 },
    'pyramid4':         { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 0.8 },
    'pyramid5':         { type: 'box', w: 0.95, h: 1.0, d: 0.95, mass: 0.85 },
    'pyramid6':         { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 0.9 },
    'pyramid8':         { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.0 },
    'pyramid12':        { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.1 },
    'pyramid16':        { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.2 },
    'pyramid-truncated':{ type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.0 },

    'cylinder':         { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.2 },
    'cylinder-hollow':  { type: 'multi', mass: 0.8, boxes: [
                          { w: 1.0, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.5 },
                          { w: 1.0, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.5 },
                          { w: 0.15, h: 1.0, d: 0.8, ox: -0.5, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.8, ox:  0.5, oy: 0, oz: 0 }
                        ] },
    'cone':             { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 0.8 },
    'cone-truncated':   { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.0 },
    'cone-hollow':      { type: 'multi', mass: 0.6, boxes: [
                          { w: 1.0, h: 0.15, d: 1.0, ox: 0, oy: -0.45, oz: 0 },
                          { w: 0.6, h: 0.7, d: 0.6, ox: 0, oy: 0.1, oz: 0 }
                        ] },
    'disc':             { type: 'box', w: 1.4, h: 0.08, d: 1.4, mass: 0.3 },
    'disc-thick':       { type: 'box', w: 1.4, h: 0.35, d: 1.4, mass: 1.0 },
    'disc-hollow':      { type: 'multi', mass: 0.5, boxes: [
                          { w: 1.4, h: 0.15, d: 0.2, ox: 0, oy: 0, oz: -0.6 },
                          { w: 1.4, h: 0.15, d: 0.2, ox: 0, oy: 0, oz:  0.6 },
                          { w: 0.2, h: 0.15, d: 1.0, ox: -0.6, oy: 0, oz: 0 },
                          { w: 0.2, h: 0.15, d: 1.0, ox:  0.6, oy: 0, oz: 0 }
                        ] },
    'torus':            { type: 'box', w: 1.0, h: 0.4, d: 1.0, mass: 0.8 },
    'torus-thick':      { type: 'box', w: 1.0, h: 0.7, d: 1.0, mass: 1.4 },
    'torus-half':       { type: 'box', w: 1.0, h: 0.4, d: 0.5, mass: 0.5 },
    'torus-major':      { type: 'box', w: 1.2, h: 0.5, d: 1.2, mass: 1.2 },
    'torus-minor':      { type: 'box', w: 0.8, h: 0.6, d: 0.8, mass: 0.7 },

    'wedge':            { type: 'box', w: 1.0, h: 0.5, d: 1.0, mass: 1.0 },
    'ramp':             { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.5 },
    'ramp-curved':      { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.5 },
    'step':             { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.8 },
    'stair':            { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 2.0 },
    'stair-spiral':     { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 2.2 },
    'arch':             { type: 'box', w: 1.0, h: 1.0, d: 0.4, mass: 1.5 },
    'arch-half':        { type: 'box', w: 0.5, h: 1.0, d: 0.4, mass: 0.8 },

    'cross':            { type: 'multi', mass: 1.0, boxes: [
                          { w: 1.0, h: 0.35, d: 0.35, ox: 0, oy: 0, oz: 0 },
                          { w: 0.35, h: 1.0, d: 0.35, ox: 0, oy: 0, oz: 0 }
                        ] },
    'plus':             { type: 'multi', mass: 0.6, boxes: [
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0, oy: 0.3, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0, oy: -0.3, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: -0.3, oy: 0, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0.3, oy: 0, oz: 0 }
                        ] },
    'star3':            { type: 'sphere', r: 0.5, mass: 0.6 },
    'star4':            { type: 'sphere', r: 0.5, mass: 0.6 },
    'star5':            { type: 'sphere', r: 0.5, mass: 0.6 },
    'star6':            { type: 'sphere', r: 0.5, mass: 0.6 },
    'star8':            { type: 'sphere', r: 0.5, mass: 0.6 },
    'star10':           { type: 'sphere', r: 0.5, mass: 0.6 },
    'star12':           { type: 'sphere', r: 0.5, mass: 0.6 },
    'star16':           { type: 'sphere', r: 0.5, mass: 0.6 },
    'ring':             { type: 'box', w: 1.0, h: 0.2, d: 1.0, mass: 0.4 },
    'spiral':           { type: 'box', w: 1.0, h: 1.0, d: 1.0, mass: 1.5 },
    'column':           { type: 'multi', mass: 2.5, boxes: [
                          { w: 0.4, h: 0.15, d: 0.4, ox: 0, oy: -0.425, oz: 0 },
                          { w: 0.25, h: 0.7, d: 0.25, ox: 0, oy: 0, oz: 0 },
                          { w: 0.4, h: 0.15, d: 0.4, ox: 0, oy: 0.425, oz: 0 }
                        ] },
    'rail':             { type: 'box', w: 1.0, h: 0.1, d: 0.2, mass: 0.5 },

    'A-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'B-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'C-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'H-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'I-shape':          { type: 'box', w: 0.6, h: 1.0, d: 0.2, mass: 0.3 },
    'O-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'T-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'U-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'X-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },
    'Z-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2, mass: 0.4 },

    'minus':            { type: 'box', w: 1.0, h: 0.35, d: 0.3, mass: 0.3 },
    'slash':            { type: 'box', w: 1.0, h: 0.2, d: 0.2, mass: 0.2 },
    'backslash':        { type: 'box', w: 1.0, h: 0.2, d: 0.2, mass: 0.2 },

    'plate-square':     { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.15 },
    'plate-rect':       { type: 'box', w: 2.0, h: 0.1, d: 1.0, mass: 0.25 },
    'plate-tri':        { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.12 },
    'plate-hex':        { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.14 },
    'plate-oct':        { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.14 },
    'plate-circle':     { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.12 },
    'plate-ring':       { type: 'multi', mass: 0.1, boxes: [
                          { w: 1.0, h: 0.1, d: 0.15, ox: 0, oy: 0, oz: -0.42 },
                          { w: 1.0, h: 0.1, d: 0.15, ox: 0, oy: 0, oz:  0.42 },
                          { w: 0.15, h: 0.1, d: 0.7, ox: -0.42, oy: 0, oz: 0 },
                          { w: 0.15, h: 0.1, d: 0.7, ox:  0.42, oy: 0, oz: 0 }
                        ] },
    'plate-star':       { type: 'box', w: 1.0, h: 0.1, d: 1.0, mass: 0.12 },

    'rod':              { type: 'box', w: 0.3, h: 1.0, d: 0.3, mass: 0.6 },
    'tube':             { type: 'multi', mass: 0.4, boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'tube-square':      { type: 'multi', mass: 0.4, boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'tube-hex':         { type: 'multi', mass: 0.4, boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'frame':            { type: 'multi', mass: 0.3, boxes: [
                          { w: 1.0, h: 0.1, d: 0.1, ox: 0, oy: 0.45, oz: 0 },
                          { w: 1.0, h: 0.1, d: 0.1, ox: 0, oy: -0.45, oz: 0 },
                          { w: 0.1, h: 0.8, d: 0.1, ox: -0.45, oy: 0, oz: 0 },
                          { w: 0.1, h: 0.8, d: 0.1, ox: 0.45, oy: 0, oz: 0 }
                        ] },
    'frame-circle':     { type: 'box', w: 1.0, h: 1.0, d: 0.1, mass: 0.3 },

    'gear':             { type: 'box', w: 1.0, h: 1.0, d: 0.25, mass: 3.0 },
    'gear-thick':       { type: 'box', w: 1.0, h: 1.0, d: 0.35, mass: 4.5 },
    'wheel':            { type: 'sphere', r: 0.5, mass: 2.5 },
    'wheel-spoke':      { type: 'multi', mass: 2.0, boxes: [
                          { w: 1.0, h: 0.2, d: 0.15, ox: 0, oy: 0.42, oz: 0 },
                          { w: 1.0, h: 0.2, d: 0.15, ox: 0, oy: -0.42, oz: 0 },
                          { w: 0.15, h: 0.2, d: 0.7, ox: -0.42, oy: 0, oz: 0 },
                          { w: 0.15, h: 0.2, d: 0.7, ox:  0.42, oy: 0, oz: 0 }
                        ] },
    'bar':              { type: 'box', w: 1.0, h: 0.2, d: 0.2, mass: 0.5 },
    'bar-curved':       { type: 'box', w: 1.0, h: 0.5, d: 0.2, mass: 0.7 },
    'beam':             { type: 'box', w: 1.0, h: 0.25, d: 0.25, mass: 0.8 },
    'beam-curved':      { type: 'box', w: 1.0, h: 0.6, d: 0.3, mass: 1.0 },
    'panel':            { type: 'box', w: 0.6, h: 1.0, d: 0.1, mass: 0.3 },
    'panel-curved':     { type: 'box', w: 0.6, h: 1.0, d: 0.1, mass: 0.35 }
  },

  PUSH: { range: 2.2, dotThreshold: 0.30, force: 8.0, cooldown: 0.6 },
  BLOCK: { moveSpeedMul: 0.5 },
  DODGE: { sideDist: 12, sideDur: 0.4, backSpeed: 10, backDur: 0.45, backLean: -0.4 },
  KNOCKDOWN: { fallDur: 0.6, lieDur: 1.2, getUpDur: 0.8 },
  ATTACK_ORIENT: { dotThreshold: 0.30 },
  INSPECT_DUR: 3.0, CLIMB_DUR: 1.2,
  CLIMB_WALL_DETECT_RANGE: 2.5, CLIMB_MIN_HEIGHT: 0.5, CLIMB_MAX_HEIGHT: 4.5, CLIMB_STEP_MAX: 0.08,

  AABB: { enable: true, maxPushIter: 4 },
  MAX_HP: 100, MAX_STAMINA: 100, STAMINA_REGEN: 18, STAMINA_SPRINT_COST: 12,
  VITALS: {
    heartIdle: 72, heartWalk: 90, heartRun: 120, heartSprint: 150, heartClimb: 135,
    lungIdle: 14, lungWalk: 20, lungRun: 28, lungSprint: 36, lungClimb: 32,
    heartHurtLight: 10, heartHurtMid: 20, heartHurtHeavy: 35,
    lungHurtLight: 4, lungHurtMid: 8, lungHurtHeavy: 12,
    heartLowStamina: 25, lungLowStamina: 10, lerpSpeed: 2.5, criticalHp: 20, blinkHp: 25
  },
  HURT_FX: {
    hitShakeMagLight: 0.15, hitShakeMagMid: 0.35, hitShakeMagHeavy: 0.55,
    hitShakeTimeLight: 0.12, hitShakeTimeMid: 0.20, hitShakeTimeHeavy: 0.28,
    hitFrameIn: 80, hitFrameOut: 150, blinkPeriodMin: 1000, blinkPeriodMax: 3000, blinkCloseMs: 90,
    desatHeavy: 0.15, blurHeavy: 2.0, slowMoHp10: 0.85, slowMoHp20: 0.95
  },
  DEATH: { fallDur: 0.5, fadeStart: 0.5, fadeDur: 0.4, blinkStart: 0.6, blinkEnd: 1.1, respawnAt: 3.2, dizzyRollAmp: 0.4, dizzySpeed: 4.0, dizzyBlur: 3.0 },
  RESPAWN_RADIUS: 10,
  STANCE: { legSpreadY: 0.08, bodyDrop: 0.0, armBendX: -0.12, armBendZ: 0.04 },
  SENS_BASE_TOUCH: 0.006, SHAKE_LEVEL: { off: 0, low: 0.4, mid: 0.7, high: 1.0 },
  QUALITY: { low: { pixelRatio: 0.9, shadowSize: 512, shadowTick: 12, maxFrags: 15 }, mid: { pixelRatio: 1.15, shadowSize: 1024, shadowTick: 8, maxFrags: 25 }, high: { pixelRatio: 1.5, shadowSize: 2048, shadowTick: 5, maxFrags: 35 }, ultra: { pixelRatio: 2.0, shadowSize: 4096, shadowTick: 3, maxFrags: 60 } },
  COLOR: { skin: 0xffcda0, shirt: 0x2b3a4a, pants: 0x1a1a1a, shoe: 0x0a0a0a, dummy: 0xffffff, ground: 0x9aac6a, stair: 0x8a8f95, sky: 0xc4d6e6, dmgNormal: '#ffffff', dmgCrit: '#ffcc33', dmgKill: '#ff3b5c', heart: '#ff3b5c', lung: '#ffffff' },
  STAIRS: { count: 5, height: 1.5, width: 3.0, depth: 2.0, baseX: 4, baseZ: -6 },

  DEFAULT_LAYOUT: {
    btnJab: { x: 0.255, y: 0.92, w: 0.065, h: 0.12 }, btnHook: { x: 0.255, y: 0.78, w: 0.065, h: 0.12 }, btnElbowL: { x: 0.255, y: 0.64, w: 0.065, h: 0.12 }, btnHammerL: { x: 0.255, y: 0.50, w: 0.065, h: 0.12 },
    btnCross: { x: 0.955, y: 0.92, w: 0.065, h: 0.12 }, btnHookR: { x: 0.955, y: 0.78, w: 0.065, h: 0.12 }, btnElbowR: { x: 0.955, y: 0.64, w: 0.065, h: 0.12 }, btnPalmR: { x: 0.955, y: 0.50, w: 0.065, h: 0.12 },
    btnLeftKick: { x: 0.385, y: 0.92, w: 0.055, h: 0.10 }, btnRightKick: { x: 0.465, y: 0.92, w: 0.055, h: 0.10 }, btnBackSpin: { x: 0.385, y: 0.80, w: 0.055, h: 0.10 }, btnKnee: { x: 0.465, y: 0.80, w: 0.055, h: 0.10 },
    btnView: { x: 0.385, y: 0.68, w: 0.055, h: 0.10 }, btnInspect: { x: 0.465, y: 0.68, w: 0.055, h: 0.10 }, btnJump: { x: 0.875, y: 0.92, w: 0.055, h: 0.10 }, btnSprint: { x: 0.875, y: 0.68, w: 0.055, h: 0.10 }, btnBlock: { x: 0.875, y: 0.56, w: 0.055, h: 0.10 }, btnClimb: { x: 0.875, y: 0.44, w: 0.055, h: 0.10 }
  },

  CH_STYLES: [ { id: 'cross', label: '十字' }, { id: 'dot', label: '点' }, { id: 'circle', label: '圆' }, { id: 'circle-dot', label: '圆点' }, { id: 'cross-dot', label: '十字点' }, { id: 'x', label: 'X 型' }, { id: 'star', label: '星形' }, { id: 'star-filled', label: '实心星' }, { id: 'diamond', label: '菱形' }, { id: 'square', label: '方块' }, { id: 't-shape', label: 'T 型' }, { id: 'brackets', label: '括号' }, { id: 'therefore', label: '三点' }, { id: 'plus', label: '加号' }, { id: 'brackets-dot', label: '括号圆点' }, { id: 'brackets-cross', label: '括号加号' }, { id: 'brackets-cross-dot', label: '括号十字点' }, { id: 'brackets-x', label: '括号叉叉' }, { id: 'brackets-circle', label: '括号圆' }, { id: 'brackets-star', label: '括号星' }, { id: 'hexagon', label: '六边形' }, { id: 'triangle', label: '三角' }, { id: 'target', label: '靶心' }, { id: 'segmented-circle',label: '分段圆' }, { id: 'dashed-circle', label: '虚线圆' }, { id: 'arrow', label: '箭头' }, { id: 'dots', label: '点阵' }, { id: 'rotating-cross', label: '旋转十字' }, { id: 'cross-brackets', label: '十字括号' } ],
  CH_COLORS: [ { id: 'white', label: '白', value: '#ffffff' }, { id: 'red', label: '红', value: '#ff3b5c' }, { id: 'green', label: '绿', value: '#4fff7a' }, { id: 'yellow', label: '黄', value: '#ffcc33' }, { id: 'blue', label: '蓝', value: '#4fd1ff' }, { id: 'cyan', label: '青', value: '#00ffff' }, { id: 'magenta', label: '品红', value: '#ff00ff' }, { id: 'custom', label: '自定义', value: '' } ],
  HIT_STYLES: [ { id: 'cross', label: '十字' }, { id: 'dot', label: '点' }, { id: 'circle', label: '圆' }, { id: 'circle-dot', label: '圆点' }, { id: 'cross-dot', label: '十字点' }, { id: 'x', label: 'X 型' }, { id: 'star', label: '星形' }, { id: 'star-filled', label: '实心星' }, { id: 'diamond', label: '菱形' }, { id: 'square', label: '方块' }, { id: 't-shape', label: 'T 型' }, { id: 'brackets', label: '括号' }, { id: 'therefore', label: '三点' }, { id: 'plus', label: '加号' }, { id: 'brackets-dot', label: '括号圆点' }, { id: 'brackets-cross', label: '括号加号' }, { id: 'brackets-cross-dot', label: '括号十字点' }, { id: 'brackets-x', label: '括号叉叉' }, { id: 'brackets-circle', label: '括号圆' }, { id: 'brackets-star', label: '括号星' }, { id: 'hexagon', label: '六边形' }, { id: 'triangle', label: '三角' }, { id: 'target', label: '靶心' }, { id: 'segmented-circle',label: '分段圆' }, { id: 'dashed-circle', label: '虚线圆' }, { id: 'arrow', label: '箭头' }, { id: 'dots', label: '点阵' }, { id: 'rotating-cross', label: '旋转十字' }, { id: 'cross-brackets', label: '十字括号' } ],
  FPS_POSITIONS: [ { id: 'top-left', label: '左上' }, { id: 'top-center', label: '顶部居中' }, { id: 'top-right', label: '右上' }, { id: 'bottom-left', label: '左下' }, { id: 'bottom-center', label: '底部居中' }, { id: 'bottom-right', label: '右下' }, { id: 'follow', label: '跟随准星' } ],

  CHAR: { name: 'Player', face: '', faceColor: '#ffcda0', faceMode: 'overlay', texTorso: '', texArmL_upper: '', texArmL_lower: '', texArmR_upper: '', texArmR_lower: '', texHandL: '', texHandR: '', texLegL_upper: '', texLegL_lower: '', texLegR_upper: '', texLegR_lower: '', texFootL: '', texFootR: '', colorTorso: '#2b3a4a', colorArmL: '#ffcda0', colorArmR: '#ffcda0', colorHandL: '#ffcda0', colorHandR: '#ffcda0', colorLegL: '#1a1a1a', colorLegR: '#1a1a1a', colorFootL: '#0a0a0a', colorFootR: '#0a0a0a', modeTorso: 'overlay', modeArmL: 'overlay', modeArmR: 'overlay', modeHandL: 'overlay', modeHandR: 'overlay', modeLegL: 'overlay', modeLegR: 'overlay', modeFootL: 'overlay', modeFootR: 'overlay', sizeHeight: 1.0, sizeHeadRatio: 1.0, sizeShoulder: 1.0, sizeArmLength: 1.0, sizeHandSize: 1.0, sizeLegLength: 1.0, sizeFootSize: 1.0, sizeBodyThick: 1.0, tattooArmL: '', tattooArmR: '', tattooChest: '', tattooBack: '', tattooColor: '#111111', tattooSymbol: '', hat: 'none', glasses: 'none', mask: 'none', headphones: 'none', necklace: 'none', watch: 'none', backpack: 'none', back: 'none', capeImage: '', colorCape: '#1a1a1a', colorCapeCollar: '#000000' },

  CHAR_TEXTURE_PARTS: [ { id: 'face', label: '脸部', type: 'face' }, { id: 'torso', label: '躯干', type: 'body' }, { id: 'armL_upper', label: '左上臂', type: 'body' }, { id: 'armL_lower', label: '左小臂', type: 'body' }, { id: 'armR_upper', label: '右上臂', type: 'body' }, { id: 'armR_lower', label: '右小臂', type: 'body' }, { id: 'handL', label: '左手', type: 'body' }, { id: 'handR', label: '右手', type: 'body' }, { id: 'legL_upper', label: '左大腿', type: 'body' }, { id: 'legL_lower', label: '左小腿', type: 'body' }, { id: 'legR_upper', label: '右大腿', type: 'body' }, { id: 'legR_lower', label: '右小腿', type: 'body' }, { id: 'footL', label: '左脚', type: 'body' }, { id: 'footR', label: '右脚', type: 'body' } ],
  CHAR_SIZE_LIMITS: [ { id: 'sizeHeight', label: '整体身高', min: 0.80, max: 1.30, def: 1.0 }, { id: 'sizeHeadRatio', label: '头身比', min: 0.70, max: 1.50, def: 1.0 }, { id: 'sizeShoulder', label: '肩宽', min: 0.70, max: 1.40, def: 1.0 }, { id: 'sizeArmLength', label: '臂长', min: 0.70, max: 1.30, def: 1.0 }, { id: 'sizeHandSize', label: '手部大小', min: 0.70, max: 1.50, def: 1.0 }, { id: 'sizeLegLength', label: '腿长', min: 0.70, max: 1.30, def: 1.0 }, { id: 'sizeFootSize', label: '脚部大小', min: 0.70, max: 1.50, def: 1.0 }, { id: 'sizeBodyThick', label: '体厚', min: 0.70, max: 1.50, def: 1.0 } ],
  CHAR_TABS: [ { id: 'head', label: '头部', parts: ['face'] }, { id: 'torso', label: '躯干', parts: ['torso'] }, { id: 'arms', label: '手臂', parts: ['armL_upper','armL_lower','armR_upper','armR_lower','handL','handR'] }, { id: 'legs', label: '腿脚', parts: ['legL_upper','legL_lower','legR_upper','legR_lower','footL','footR'] }, { id: 'size', label: '尺寸', parts: [] } ],
  CHAR_PRESET_COLORS: [ '#ffffff', '#000000', '#ff3b5c', '#ffcc33', '#4fd1ff', '#4fff7a', '#ff8c33', '#9c27b0', '#ffcda0', '#2b3a4a', '#1a1a1a', '#0a0a0a' ],
  ACCESSORIES: { hat: [ { id: 'none', name: '无' }, { id: 'cap', name: '鸭舌帽' }, { id: 'helmet', name: '头盔' }, { id: 'crown', name: '王冠' }, { id: 'beanie', name: '毛线帽' } ], glasses: [ { id: 'none', name: '无' }, { id: 'normal', name: '普通' }, { id: 'sun', name: '墨镜' }, { id: 'round', name: '圆框' } ], mask: [ { id: 'none', name: '无' }, { id: 'surgical', name: '医用' }, { id: 'n95', name: 'N95' }, { id: 'bandana', name: '头巾' } ], headphones: [ { id: 'none', name: '无' }, { id: 'headset', name: '耳麦' } ], necklace: [ { id: 'none', name: '无' }, { id: 'chain', name: '金链' }, { id: 'pendant', name: '吊坠' }, { id: 'choker', name: '颈圈' } ], watch: [ { id: 'none', name: '无' }, { id: 'watch', name: '普通' }, { id: 'band', name: '腕带' } ], backpack: [ { id: 'none', name: '无' }, { id: 'small', name: '小背包' }, { id: 'large', name: '大背包' } ] },
  NET_AUDIO: {},

  DEFAULT_SETTINGS: { tbox_quality: 'auto', tbox_resScale: 100, tbox_aa: 'off', tbox_lighting: '0', tbox_shadow: '0', tbox_shadowQ: 'mid', tbox_fog: '1', tbox_bloom: '0', tbox_vignette: '1', tbox_speedlines: '1', tbox_hdr: '0', tbox_shadowType: 'pcfsoft', tbox_shadowDist: 'mid', tbox_ambientIntensity: 100, tbox_toneMapping: 'aces', tbox_exposure: 105, tbox_fxaa: 'off', tbox_shadowSoft: 2, tbox_fogDensity: 100, tbox_bloomStrength: 50, tbox_csmEnabled: '0', tbox_motionBlur: '0', tbox_filmGrain: '0', tbox_colorGrade: '0', tbox_colorSaturation: 100, tbox_colorContrast: 100, tbox_colorBrightness: 100, tbox_perfMode: '0', tbox_fov: 120, tbox_view: 'fps', tbox_tpsDist: 45, tbox_tpsH: 16, tbox_camSmooth: '1', tbox_shake: 'high', tbox_sens: 22, tbox_mouseAccel: '0', tbox_invertY: '0', tbox_joyDead: 15, tbox_volMaster: 70, tbox_volSfx: 70, tbox_sfxOn: '1', tbox_showfps: 'off', tbox_showCoord: '0', tbox_showStance: '1', tbox_showCompass: '1', tbox_showCrosshair: '1', tbox_showHp: '1', tbox_compassOpacity: 100, tbox_compassPos: 'top', tbox_hudOpacity: 100, tbox_hudScale: 100, tbox_fpsPos: 'top-left', tbox_fpsSize: 11, tbox_hurtVignette: '1', tbox_chStyle: 'cross', tbox_chColor: 'white', tbox_chColorCustom: '#ffffff', tbox_chSize: 100, tbox_chThickness: 2, tbox_chGap: 8, tbox_chOpacity: 100, tbox_chDynamic: '1', tbox_chShadow: '1', tbox_showDmgNumber: '1', tbox_showDmgIcon: '1', tbox_hitStyle: 'cross', tbox_hitSize: 100, tbox_hitFloat: 60, tbox_dmgSize: 100, tbox_viewSway: '1', tbox_runShake: '1', tbox_swayAmount: 100, tbox_runShakeAmount: 100, tbox_hitShake: '1', tbox_hitFrame: '1', tbox_blinkFx: '1', tbox_slowMo: '1', tbox_desatFx: '1', tbox_vitals: '1', tbox_vitalsSound: '1', tbox_heartSound: '1', tbox_breathSound: '1', tbox_ambientSound: '1', tbox_killFeed: '1', tbox_hitDirection: '1', tbox_killIcon: '1', tbox_lowHpSound: '1', tbox_autoPickup: '1', tbox_joySens: 100, tbox_lookSens: 100, tbox_btnScale: 100, tbox_btnOpacity: 100, tbox_vibrate: '1', tbox_charName: 'Player', tbox_pauseOnBack: '0', tbox_fpsLimit: 60, tbox_autoSaveLayout: '1' }
};