/* ============================================================
 * data.js · 数据系统
 * V2.0.0 · 去重形状 + 精确多AABB碰撞 + 真双壁空心 + 攻击推物
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.DATA = {
  VERSION: (window.TBOX.VERSION && window.TBOX.VERSION.NUMBER) || '1.0.0',
  VERSION_LABEL: (window.TBOX.VERSION && window.TBOX.VERSION.LABEL) || 'V1.0.0 · STABLE',
  BUILD: (window.TBOX.VERSION && window.TBOX.VERSION.BUILD) || 100,

  EYE_H: 1.55,
  PLAYER_RADIUS: 0.35,
  PLAYER_HEIGHT: 1.60,
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
  SLIDE_CAM_DIP: 0.55,
  SLIDE_FOV_ADD: 12,
  SLIDE_PITCH_ADD: -0.15,

  VIEW_SWAY: {
    ampX: 0.006, ampY: 0.008,
    speedIdle: 0.4, speedWalk: 1.0, speedRun: 1.8, speedSprint: 2.4,
    breathAmp: 0.010, breathSpeed: 1.5
  },
  RUN_SHAKE: { walkAmp: 0.012, runAmp: 0.022, sprintAmp: 0.035, speed: 12 },
  VIEW_SHAKE: {
    hitAmpSmall: 0.20, hitAmpMid: 0.45, hitAmpLarge: 0.70,
    hitTimeSmall: 0.10, hitTimeMid: 0.18, hitTimeLarge: 0.28,
    attackAmp: 0.06, attackTime: 0.08
  },

  ARM_SHOULDER_X: 0.22,
  ARM_SHOULDER_Y: 1.34,
  ARM_SHOULDER_Z: 0.03,
  ARM_BASE_Z_ROT: 0.06,

  ATTACK_RANGE: 1.9,
  TARGET_HP: 5,

  ATK_DUR: {
    jab: 0.20, cross: 0.24, hookL: 0.40, hookR: 0.40,
    hammer: 0.40, palm: 0.26, elbowL: 0.30, elbowR: 0.30,
    leftKick: 0.46, rightKick: 0.46, push: 0.35, knee: 0.40
  },
  ATK_DMG: {
    jab: 1, cross: 2, hookL: 3, hookR: 3,
    hammer: 3, palm: 1, elbowL: 3, elbowR: 3,
    leftKick: 3, rightKick: 3, push: 0, knee: 3
  },
  ATK_HIT_AT: {
    jab: 0.30, cross: 0.30, hookL: 0.40, hookR: 0.40,
    hammer: 0.45, palm: 0.30, elbowL: 0.38, elbowR: 0.38,
    leftKick: 0.38, rightKick: 0.38, push: 0.35, knee: 0.40
  },

  SPRINT_ATK: { kickMul: 6.0, kickKnockBack: 12.0, pushMul: 1.75, pushForce: 14.0 },

  KICK_FLY: {
    enable: true,
    maxDistance: 3.0,
    flySpeed: 14.0,
    flyUp: 3.5,
    gravity: -22,
    friction: 3.5,
    minDmgForFly: 3,
    armPart: 'arm',
    headPart: 'head',
    bodyPart: 'body',
    legPart: 'leg'
  },

  HIT_PART: {
    headMinY: 1.45,
    headMaxY: 1.75,
    armMinY: 1.10,
    armMaxY: 1.45,
    bodyMinY: 0.85,
    bodyMaxY: 1.45,
    legMinY: 0.0,
    legMaxY: 0.85
  },

  PHYSICS: {
    enable: true,
    gravity: -22,
    friction: 4.0,
    airFriction: 0.5,
    restitution: 0.15,
    sleepSpeed: 0.05,
    sleepTime: 0.5,
    maxProps: 300,
    propCollision: true,
    collideStairs: true,
    playerPush: true,
    playerPushForce: 6.0,
    grabFollowLambda: 20
  },

  GRAB: {
    enable: true,
    range: 3.0,
    holdDistance: 1.5,
    holdHeight: 1.3,
    throwSpeed: 12.0,
    grabKey: 'KeyE',
    throwKey: 'Mouse0',
    facePlayer: true
  },

  /* ★ 攻击推物体的配置 */
  ATTACK_PUSH: {
    enable: true,
    force: 8.0,
    upForce: 1.5,
    range: 2.0
  },

  /* ★ 每个形状的精确碰撞箱定义
   * type: 'box'   单一 AABB
   *       'multi' 多个 AABB
   *       'sphere' 球体（用半径）
   * 参数：w/h/d 宽高深（相对 sizeScale）
   *      ox/oy/oz 偏移（相对 sizeScale）
   */
  COLLISION: {
    /* 多面体 */
    'cube':             { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'cuboid':           { type: 'box', w: 1.6, h: 0.8, d: 1.0 },
    'tetrahedron':      { type: 'sphere', r: 0.45 },
    'octahedron':       { type: 'sphere', r: 0.45 },
    'dodecahedron':     { type: 'sphere', r: 0.45 },
    'icosahedron':      { type: 'sphere', r: 0.45 },
    'sphere':           { type: 'sphere', r: 0.5 },
    'hemisphere':       { type: 'sphere', r: 0.5, hy: 0.5, oy: -0.25 },
    'quarter-sphere':   { type: 'sphere', r: 0.5, ox: -0.25, oy: -0.25 },
    'capsule':          { type: 'box', w: 0.7, h: 1.0, d: 0.7 },

    /* 棱柱 */
    'prism3':           { type: 'box', w: 0.9, h: 1.0, d: 0.9 },
    'prism4':           { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'prism5':           { type: 'box', w: 0.95, h: 1.0, d: 0.95 },
    'prism6':           { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'prism8':           { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'prism12':          { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'prism16':          { type: 'box', w: 1.0, h: 1.0, d: 1.0 },

    /* 棱锥 */
    'pyramid3':         { type: 'box', w: 0.9, h: 1.0, d: 0.9 },
    'pyramid4':         { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'pyramid5':         { type: 'box', w: 0.95, h: 1.0, d: 0.95 },
    'pyramid6':         { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'pyramid8':         { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'pyramid12':        { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'pyramid16':        { type: 'box', w: 1.0, h: 1.0, d: 1.0 },

    /* 圆柱 / 圆锥 / 圆盘 */
    'cylinder':         { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'cylinder-hollow':  { type: 'multi', boxes: [
                          { w: 1.0, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.5 },
                          { w: 1.0, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.5 },
                          { w: 0.15, h: 1.0, d: 0.8, ox: -0.5, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.8, ox:  0.5, oy: 0, oz: 0 }
                        ] },
    'cone':             { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'cone-truncated':   { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'disc':             { type: 'box', w: 1.4, h: 0.08, d: 1.4 },
    'disc-thick':       { type: 'box', w: 1.4, h: 0.35, d: 1.4 },
    'disc-hollow':      { type: 'multi', boxes: [
                          { w: 1.4, h: 0.15, d: 0.2, ox: 0, oy: 0, oz: -0.6 },
                          { w: 1.4, h: 0.15, d: 0.2, ox: 0, oy: 0, oz:  0.6 },
                          { w: 0.2, h: 0.15, d: 1.0, ox: -0.6, oy: 0, oz: 0 },
                          { w: 0.2, h: 0.15, d: 1.0, ox:  0.6, oy: 0, oz: 0 }
                        ] },
    'torus':            { type: 'box', w: 1.0, h: 0.4, d: 1.0 },
    'torus-thick':      { type: 'box', w: 1.0, h: 0.7, d: 1.0 },
    'torus-half':       { type: 'box', w: 1.0, h: 0.4, d: 0.5 },

    /* 楔形 / 斜坡 / 台阶 */
    'wedge':            { type: 'box', w: 1.0, h: 0.5, d: 1.0 },
    'wedge-curved':     { type: 'box', w: 1.0, h: 0.5, d: 1.0 },
    'ramp':             { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'ramp-curved':      { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'step':             { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'stair':            { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'stair-spiral':     { type: 'box', w: 1.0, h: 1.0, d: 1.0 },
    'arch':             { type: 'box', w: 1.0, h: 1.0, d: 0.4 },
    'arch-half':        { type: 'box', w: 0.5, h: 1.0, d: 0.4 },

    /* 特殊形状 */
    'cross':            { type: 'multi', boxes: [
                          { w: 1.0, h: 0.35, d: 0.35, ox: 0, oy: 0, oz: 0 },
                          { w: 0.35, h: 1.0, d: 0.35, ox: 0, oy: 0, oz: 0 }
                        ] },
    'plus':             { type: 'multi', boxes: [
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0, oy: 0.3, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0, oy: -0.3, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: -0.3, oy: 0, oz: 0 },
                          { w: 0.35, h: 0.35, d: 0.35, ox: 0.3, oy: 0, oz: 0 }
                        ] },
    'star3':            { type: 'sphere', r: 0.5 },
    'star4':            { type: 'sphere', r: 0.5 },
    'star5':            { type: 'sphere', r: 0.5 },
    'star6':            { type: 'sphere', r: 0.5 },
    'star8':            { type: 'sphere', r: 0.5 },
    'ring':             { type: 'box', w: 1.0, h: 0.2, d: 1.0 },

    /* 字母（像素风） */
    'A-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'B-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'C-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'H-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'I-shape':          { type: 'box', w: 0.6, h: 1.0, d: 0.2 },
    'O-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'T-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'U-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'X-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },
    'Z-shape':          { type: 'box', w: 0.8, h: 1.0, d: 0.2 },

    'minus':            { type: 'box', w: 1.0, h: 0.35, d: 0.3 },
    'slash':            { type: 'box', w: 1.0, h: 0.2, d: 0.2 },
    'backslash':        { type: 'box', w: 1.0, h: 0.2, d: 0.2 },

    /* 薄片 / 面板 */
    'plate-square':     { type: 'box', w: 1.0, h: 0.1, d: 1.0 },
    'plate-rect':       { type: 'box', w: 2.0, h: 0.1, d: 1.0 },
    'plate-tri':        { type: 'box', w: 1.0, h: 0.1, d: 1.0 },
    'plate-hex':        { type: 'box', w: 1.0, h: 0.1, d: 1.0 },
    'plate-oct':        { type: 'box', w: 1.0, h: 0.1, d: 1.0 },
    'plate-circle':     { type: 'box', w: 1.0, h: 0.1, d: 1.0 },
    'plate-ring':       { type: 'multi', boxes: [
                          { w: 1.0, h: 0.1, d: 0.15, ox: 0, oy: 0, oz: -0.42 },
                          { w: 1.0, h: 0.1, d: 0.15, ox: 0, oy: 0, oz:  0.42 },
                          { w: 0.15, h: 0.1, d: 0.7, ox: -0.42, oy: 0, oz: 0 },
                          { w: 0.15, h: 0.1, d: 0.7, ox:  0.42, oy: 0, oz: 0 }
                        ] },
    'plate-star':       { type: 'box', w: 1.0, h: 0.1, d: 1.0 },

    /* 细杆 / 管 */
    'rod':              { type: 'box', w: 0.3, h: 1.0, d: 0.3 },
    'rod-hex':          { type: 'box', w: 0.3, h: 1.0, d: 0.3 },
    'tube':             { type: 'multi', boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'tube-square':      { type: 'multi', boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'tube-hex':         { type: 'multi', boxes: [
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz: -0.15 },
                          { w: 0.44, h: 1.0, d: 0.15, ox: 0, oy: 0, oz:  0.15 },
                          { w: 0.15, h: 1.0, d: 0.14, ox: -0.15, oy: 0, oz: 0 },
                          { w: 0.15, h: 1.0, d: 0.14, ox:  0.15, oy: 0, oz: 0 }
                        ] },
    'frame':            { type: 'multi', boxes: [
                          { w: 1.0, h: 0.1, d: 0.1, ox: 0, oy: 0.45, oz: 0 },
                          { w: 1.0, h: 0.1, d: 0.1, ox: 0, oy: -0.45, oz: 0 },
                          { w: 0.1, h: 0.8, d: 0.1, ox: -0.45, oy: 0, oz: 0 },
                          { w: 0.1, h: 0.8, d: 0.1, ox: 0.45, oy: 0, oz: 0 }
                        ] },
    'frame-circle':     { type: 'box', w: 1.0, h: 1.0, d: 0.1 },

    /* 复杂组合体 */
    'gear':             { type: 'box', w: 1.0, h: 1.0, d: 0.25 },
    'gear-thick':       { type: 'box', w: 1.0, h: 1.0, d: 0.35 },
    'wheel':            { type: 'sphere', r: 0.5 },
    'wheel-spoke':      { type: 'multi', boxes: [
                          { w: 1.0, h: 0.2, d: 0.15, ox: 0, oy: 0.42, oz: 0 },
                          { w: 1.0, h: 0.2, d: 0.15, ox: 0, oy: -0.42, oz: 0 },
                          { w: 0.15, h: 0.2, d: 0.7, ox: -0.42, oy: 0, oz: 0 },
                          { w: 0.15, h: 0.2, d: 0.7, ox:  0.42, oy: 0, oz: 0 }
                        ] },
    'bar':              { type: 'box', w: 1.0, h: 0.2, d: 0.2 },
    'bar-curved':       { type: 'box', w: 1.0, h: 0.5, d: 0.2 },
    'beam':             { type: 'box', w: 1.0, h: 0.25, d: 0.25 },
    'beam-curved':      { type: 'box', w: 1.0, h: 0.6, d: 0.3 },
    'panel':            { type: 'box', w: 0.6, h: 1.0, d: 0.1 },
    'panel-curved':     { type: 'box', w: 0.6, h: 1.0, d: 0.1 },

    'bracket-U':        { type: 'multi', boxes: [
                          { w: 0.3, h: 0.8, d: 0.3, ox: -0.35, oy: 0, oz: 0 },
                          { w: 0.3, h: 0.8, d: 0.3, ox:  0.35, oy: 0, oz: 0 },
                          { w: 0.4, h: 0.3, d: 0.3, ox: 0, oy: -0.25, oz: 0 }
                        ] },
    'bracket-L':        { type: 'multi', boxes: [
                          { w: 0.3, h: 0.8, d: 0.3, ox: -0.35, oy: 0, oz: 0 },
                          { w: 0.7, h: 0.3, d: 0.3, ox: 0.1, oy: -0.25, oz: 0 }
                        ] },
    'bracket-T':        { type: 'multi', boxes: [
                          { w: 1.0, h: 0.3, d: 0.3, ox: 0, oy: 0.35, oz: 0 },
                          { w: 0.3, h: 0.7, d: 0.3, ox: 0, oy: -0.15, oz: 0 }
                        ] }
  },

  PUSH: {
    range: 2.2, dotThreshold: 0.30, force: 8.0,
    pushBackSelf: 0.5, knockDownChance: 1.0,
    pushDuration: 0.4, cooldown: 0.6
  },
  BLOCK: {
    doubleDigitReduce: 10, singleDigitReduce: 3, minDamage: 0,
    moveSpeedMul: 0.5, duration: 999, cooldown: 0.2, validThreshold: 0.3
  },
  DODGE: {
    sideDir: 1, sideDist: 12, sideDur: 0.4, sideRoll: 0.5,
    backSpeed: 10, backDist: 5, backDur: 0.45, backLean: -0.4,
    iframe: 0.3, cooldown: 0.3, doubleTapMs: 280
  },
  KNOCKDOWN: {
    fallDur: 0.6, lieDur: 1.2, getUpDur: 0.8,
    pushForce: 6.0, friction: 4.0, rotationSpeed: 8.0,
    chaseDelay: 0.5, bounceCount: 2, bounceFactor: 0.35, bounceDelay: 0.15
  },
  ATTACK_ORIENT: {
    dotThreshold: 0.30, frontAngle: 0.75, sideAngle: 0.35,
    backAngle: -0.3, selfFacingDot: 0.0
  },

  INSPECT_DUR: 3.0,
  SLIDE_DUR: 1.0,
  CLIMB_DUR: 1.2,
  CLIMB_RANGE: 2.2,
  CLIMB_ONE_HAND_H: 1.5,
  CLIMB_ANY_SURFACE: true,
  CLIMB_WALL_DETECT_RANGE: 2.5,
  CLIMB_MULTI_DIR: true,
  CLIMB_MIN_HEIGHT: 0.5,
  CLIMB_MAX_HEIGHT: 4.5,
  CLIMB_OMNI_DIR: true,
  CLIMB_CANCEL_KEY: 'both',
  CLIMB_NO_ATTACK: true,
  CLIMB_STEP_MAX: 0.08,
  SLIDE_SIDE: {
    enabled: true, bodyDrop: 0.70, sideTilt: 0.45,
    twistAmount: 0.35, camRoll: 0.45, legSpreadY: 0.30,
    duration: 1.0, speed: 8.5
  },

  AABB: {
    enable: true,
    playerRadius: 0.35,
    playerHeight: 1.60,
    maxPushIter: 4,
    staticList: [],
    dynamicList: []
  },

  MAX_HP: 100, MAX_STAMINA: 100,
  HP_REGEN: 0, STAMINA_REGEN: 18,
  STAMINA_SPRINT_COST: 12,
  STAMINA_ATTACK_COST: 0,
  HP_DEATH: 0,

  HP_COLOR: {
    white: { min: 70, color: '#ffffff', status: '良好' },
    yellow: { min: 40, color: '#ffcc33', status: '轻伤' },
    red: { min: 1, color: '#ff3b5c', status: '重伤' },
    black: { min: 0, color: '#000000', status: '死亡' }
  },
  HURT_VIGNETTE: { light: 0.2, mid: 0.5, heavy: 0.8, dying: 1.0 },
  VITALS: {
    heartIdle: 72, heartWalk: 90, heartRun: 120, heartSprint: 150, heartClimb: 135,
    lungIdle: 14, lungWalk: 20, lungRun: 28, lungSprint: 36, lungClimb: 32,
    heartHurtLight: 10, heartHurtMid: 20, heartHurtHeavy: 35,
    lungHurtLight: 4, lungHurtMid: 8, lungHurtHeavy: 12,
    heartLowStamina: 25, lungLowStamina: 10,
    lerpSpeed: 2.5, criticalHp: 20, blinkHp: 25
  },
  HURT_FX: {
    hitShakeMagLight: 0.15, hitShakeMagMid: 0.35, hitShakeMagHeavy: 0.55,
    hitShakeTimeLight: 0.12, hitShakeTimeMid: 0.20, hitShakeTimeHeavy: 0.28,
    hitFrameHeight: 10, hitFrameIn: 80, hitFrameOut: 150,
    blinkPeriodMin: 1000, blinkPeriodMax: 3000, blinkCloseMs: 90,
    desatHeavy: 0.15, blurHeavy: 2.0,
    slowMoHp10: 0.85, slowMoHp20: 0.95
  },
  DEATH: {
    fallDur: 0.5, lieDur: 0.3,
    fadeStart: 0.5, fadeDur: 0.4,
    blinkStart: 0.6, blinkEnd: 1.1,
    blackout: 1.2, respawnAt: 3.2,
    dizzyRollAmp: 0.4, dizzySpeed: 4.0, dizzyBlur: 3.0
  },
  TINNITUS: { volume: 0.35, duration: 3.0 },
  RESPAWN_RADIUS: 10,
  STANCE: {
    legSpreadY: 0.08, thighX: 0.0, shinX: 0.0, footX: 0.0, footY: 0.0,
    bodyDrop: 0.0, armBendX: -0.12, armBendZ: 0.04
  },
  SENS_BASE_TOUCH: 0.006,
  SHAKE_LEVEL: { off: 0, low: 0.4, mid: 0.7, high: 1.0 },
  QUALITY: {
    low:   { pixelRatio: 0.9,  shadowSize: 512,  shadowTick: 12, maxFrags: 15 },
    mid:   { pixelRatio: 1.15, shadowSize: 1024, shadowTick: 8,  maxFrags: 25 },
    high:  { pixelRatio: 1.5,  shadowSize: 2048, shadowTick: 5,  maxFrags: 35 },
    ultra: { pixelRatio: 2.0,  shadowSize: 4096, shadowTick: 3,  maxFrags: 60 }
  },
  COLOR: {
    skin: 0xffcda0, shirt: 0x2b3a4a, pants: 0x1a1a1a, shoe: 0x0a0a0a,
    dummy: 0xffffff, ground: 0x9aac6a, stair: 0x8a8f95, sky: 0xc4d6e6,
    dmgNormal: '#ffffff', dmgCrit: '#ffcc33', dmgKill: '#ff3b5c',
    heart: '#ff3b5c', lung: '#ffffff'
  },
  STAIRS: { count: 5, height: 1.5, width: 3.0, depth: 2.0, baseX: 4, baseZ: -6 },

  DEFAULT_LAYOUT: {
    btnJab:       { x: 0.255, y: 0.92, w: 0.065, h: 0.12 },
    btnHook:      { x: 0.255, y: 0.78, w: 0.065, h: 0.12 },
    btnElbowL:    { x: 0.255, y: 0.64, w: 0.065, h: 0.12 },
    btnHammerL:   { x: 0.255, y: 0.50, w: 0.065, h: 0.12 },
    btnCross:     { x: 0.955, y: 0.92, w: 0.065, h: 0.12 },
    btnHookR:     { x: 0.955, y: 0.78, w: 0.065, h: 0.12 },
    btnElbowR:    { x: 0.955, y: 0.64, w: 0.065, h: 0.12 },
    btnPalmR:     { x: 0.955, y: 0.50, w: 0.065, h: 0.12 },
    btnLeftKick:  { x: 0.385, y: 0.92, w: 0.055, h: 0.10 },
    btnRightKick: { x: 0.465, y: 0.92, w: 0.055, h: 0.10 },
    btnBackSpin:  { x: 0.385, y: 0.80, w: 0.055, h: 0.10 },
    btnKnee:      { x: 0.465, y: 0.80, w: 0.055, h: 0.10 },
    btnView:      { x: 0.385, y: 0.68, w: 0.055, h: 0.10 },
    btnInspect:   { x: 0.465, y: 0.68, w: 0.055, h: 0.10 },
    btnJump:      { x: 0.875, y: 0.92, w: 0.055, h: 0.10 },
    btnSprint:    { x: 0.875, y: 0.68, w: 0.055, h: 0.10 },
    btnBlock:     { x: 0.875, y: 0.56, w: 0.055, h: 0.10 },
    btnClimb:     { x: 0.875, y: 0.44, w: 0.055, h: 0.10 }
  },

  CH_STYLES: [
    { id: 'cross',           label: '十字' },
    { id: 'dot',             label: '点' },
    { id: 'circle',          label: '圆' },
    { id: 'circle-dot',      label: '圆点' },
    { id: 'cross-dot',       label: '十字点' },
    { id: 'x',               label: 'X 型' },
    { id: 'star',            label: '星形' },
    { id: 'star-filled',     label: '实心星' },
    { id: 'diamond',         label: '菱形' },
    { id: 'square',          label: '方块' },
    { id: 't-shape',         label: 'T 型' },
    { id: 'brackets',        label: '括号' },
    { id: 'therefore',       label: '三点' },
    { id: 'plus',            label: '加号' },
    { id: 'brackets-dot',    label: '括号圆点' },
    { id: 'brackets-cross',  label: '括号加号' },
    { id: 'brackets-cross-dot', label: '括号十字点' },
    { id: 'brackets-x',      label: '括号叉叉' },
    { id: 'brackets-circle', label: '括号圆' },
    { id: 'brackets-star',   label: '括号星' },
    { id: 'hexagon',         label: '六边形' },
    { id: 'triangle',        label: '三角' },
    { id: 'target',          label: '靶心' },
    { id: 'segmented-circle',label: '分段圆' },
    { id: 'dashed-circle',   label: '虚线圆' },
    { id: 'arrow',           label: '箭头' },
    { id: 'dots',            label: '点阵' },
    { id: 'rotating-cross',  label: '旋转十字' },
    { id: 'cross-brackets',  label: '十字括号' }
  ],

  CH_COLORS: [
    { id: 'white',   label: '白',   value: '#ffffff' },
    { id: 'red',     label: '红',   value: '#ff3b5c' },
    { id: 'green',   label: '绿',   value: '#4fff7a' },
    { id: 'yellow',  label: '黄',   value: '#ffcc33' },
    { id: 'blue',    label: '蓝',   value: '#4fd1ff' },
    { id: 'cyan',    label: '青',   value: '#00ffff' },
    { id: 'magenta', label: '品红', value: '#ff00ff' },
    { id: 'custom',  label: '自定义', value: '' }
  ],

  HIT_STYLES: [
    { id: 'cross',           label: '十字' },
    { id: 'dot',             label: '点' },
    { id: 'circle',          label: '圆' },
    { id: 'circle-dot',      label: '圆点' },
    { id: 'cross-dot',       label: '十字点' },
    { id: 'x',               label: 'X 型' },
    { id: 'star',            label: '星形' },
    { id: 'star-filled',     label: '实心星' },
    { id: 'diamond',         label: '菱形' },
    { id: 'square',          label: '方块' },
    { id: 't-shape',         label: 'T 型' },
    { id: 'brackets',        label: '括号' },
    { id: 'therefore',       label: '三点' },
    { id: 'plus',            label: '加号' },
    { id: 'brackets-dot',    label: '括号圆点' },
    { id: 'brackets-cross',  label: '括号加号' },
    { id: 'brackets-cross-dot', label: '括号十字点' },
    { id: 'brackets-x',      label: '括号叉叉' },
    { id: 'brackets-circle', label: '括号圆' },
    { id: 'brackets-star',   label: '括号星' },
    { id: 'hexagon',         label: '六边形' },
    { id: 'triangle',        label: '三角' },
    { id: 'target',          label: '靶心' },
    { id: 'segmented-circle',label: '分段圆' },
    { id: 'dashed-circle',   label: '虚线圆' },
    { id: 'arrow',           label: '箭头' },
    { id: 'dots',            label: '点阵' },
    { id: 'rotating-cross',  label: '旋转十字' },
    { id: 'cross-brackets',  label: '十字括号' }
  ],

  FPS_POSITIONS: [
    { id: 'top-left',      label: '左上' },
    { id: 'top-center',    label: '顶部居中' },
    { id: 'top-right',     label: '右上' },
    { id: 'bottom-left',   label: '左下' },
    { id: 'bottom-center', label: '底部居中' },
    { id: 'bottom-right',  label: '右下' },
    { id: 'follow',        label: '跟随准星' }
  ],

  CHAR: {
    name: 'Player',
    face: '', faceColor: '#ffcda0', faceMode: 'overlay',
    texTorso: '', texArmL_upper: '', texArmL_lower: '',
    texArmR_upper: '', texArmR_lower: '', texHandL: '', texHandR: '',
    texLegL_upper: '', texLegL_lower: '', texLegR_upper: '', texLegR_lower: '',
    texFootL: '', texFootR: '',
    colorTorso: '#2b3a4a', colorArmL: '#ffcda0', colorArmR: '#ffcda0',
    colorHandL: '#ffcda0', colorHandR: '#ffcda0',
    colorLegL: '#1a1a1a', colorLegR: '#1a1a1a',
    colorFootL: '#0a0a0a', colorFootR: '#0a0a0a',
    modeTorso: 'overlay', modeArmL: 'overlay', modeArmR: 'overlay',
    modeHandL: 'overlay', modeHandR: 'overlay',
    modeLegL: 'overlay', modeLegR: 'overlay',
    modeFootL: 'overlay', modeFootR: 'overlay',
    sizeHeight: 1.0, sizeHeadRatio: 1.0, sizeShoulder: 1.0,
    sizeArmLength: 1.0, sizeHandSize: 1.0, sizeLegLength: 1.0,
    sizeFootSize: 1.0, sizeBodyThick: 1.0,
    tattooArmL: '', tattooArmR: '', tattooChest: '', tattooBack: '',
    tattooColor: '#111111', tattooSymbol: '',
    hat: 'none', glasses: 'none', mask: 'none', headphones: 'none',
    necklace: 'none', watch: 'none', backpack: 'none',
    back: 'none', capeImage: '', colorCape: '#1a1a1a', colorCapeCollar: '#000000'
  },

  CHAR_TEXTURE_PARTS: [
    { id: 'face',       label: '脸部',   type: 'face' },
    { id: 'torso',      label: '躯干',   type: 'body' },
    { id: 'armL_upper', label: '左上臂', type: 'body' },
    { id: 'armL_lower', label: '左小臂', type: 'body' },
    { id: 'armR_upper', label: '右上臂', type: 'body' },
    { id: 'armR_lower', label: '右小臂', type: 'body' },
    { id: 'handL',      label: '左手',   type: 'body' },
    { id: 'handR',      label: '右手',   type: 'body' },
    { id: 'legL_upper', label: '左大腿', type: 'body' },
    { id: 'legL_lower', label: '左小腿', type: 'body' },
    { id: 'legR_upper', label: '右大腿', type: 'body' },
    { id: 'legR_lower', label: '右小腿', type: 'body' },
    { id: 'footL',      label: '左脚',   type: 'body' },
    { id: 'footR',      label: '右脚',   type: 'body' }
  ],
  CHAR_SIZE_LIMITS: [
    { id: 'sizeHeight',     label: '整体身高', min: 0.80, max: 1.30, def: 1.0 },
    { id: 'sizeHeadRatio',  label: '头身比',   min: 0.70, max: 1.50, def: 1.0 },
    { id: 'sizeShoulder',   label: '肩宽',     min: 0.70, max: 1.40, def: 1.0 },
    { id: 'sizeArmLength',  label: '臂长',     min: 0.70, max: 1.30, def: 1.0 },
    { id: 'sizeHandSize',   label: '手部大小', min: 0.70, max: 1.50, def: 1.0 },
    { id: 'sizeLegLength',  label: '腿长',     min: 0.70, max: 1.30, def: 1.0 },
    { id: 'sizeFootSize',   label: '脚部大小', min: 0.70, max: 1.50, def: 1.0 },
    { id: 'sizeBodyThick',  label: '体厚',     min: 0.70, max: 1.50, def: 1.0 }
  ],
  CHAR_TABS: [
    { id: 'head',  label: '头部', parts: ['face'] },
    { id: 'torso', label: '躯干', parts: ['torso'] },
    { id: 'arms',  label: '手臂', parts: ['armL_upper','armL_lower','armR_upper','armR_lower','handL','handR'] },
    { id: 'legs',  label: '腿脚', parts: ['legL_upper','legL_lower','legR_upper','legR_lower','footL','footR'] },
    { id: 'size',  label: '尺寸', parts: [] }
  ],
  CHAR_PRESET_COLORS: [
    '#ffffff', '#000000', '#ff3b5c', '#ffcc33',
    '#4fd1ff', '#4fff7a', '#ff8c33', '#9c27b0',
    '#ffcda0', '#2b3a4a', '#1a1a1a', '#0a0a0a'
  ],
  ACCESSORIES: {
    hat: [
      { id: 'none', name: '无' }, { id: 'cap', name: '鸭舌帽' },
      { id: 'helmet', name: '头盔' }, { id: 'crown', name: '王冠' },
      { id: 'beanie', name: '毛线帽' }
    ],
    glasses: [
      { id: 'none', name: '无' }, { id: 'normal', name: '普通' },
      { id: 'sun', name: '墨镜' }, { id: 'round', name: '圆框' }
    ],
    mask: [
      { id: 'none', name: '无' }, { id: 'surgical', name: '医用' },
      { id: 'n95', name: 'N95' }, { id: 'bandana', name: '头巾' }
    ],
    headphones: [
      { id: 'none', name: '无' }, { id: 'headset', name: '耳麦' }
    ],
    necklace: [
      { id: 'none', name: '无' }, { id: 'chain', name: '金链' },
      { id: 'pendant', name: '吊坠' }, { id: 'choker', name: '颈圈' }
    ],
    watch: [
      { id: 'none', name: '无' }, { id: 'watch', name: '普通' },
      { id: 'band', name: '腕带' }
    ],
    backpack: [
      { id: 'none', name: '无' }, { id: 'small', name: '小背包' },
      { id: 'large', name: '大背包' }
    ]
  },
  NET_AUDIO: {},

  DEFAULT_SETTINGS: {
    tbox_quality: 'auto', tbox_resScale: 100, tbox_aa: 'off',
    tbox_lighting: '0', tbox_shadow: '0', tbox_shadowQ: 'mid',
    tbox_fog: '1', tbox_bloom: '0', tbox_vignette: '1', tbox_speedlines: '1',
    tbox_hdr: '0',
    tbox_shadowType: 'pcfsoft', tbox_shadowDist: 'mid',
    tbox_ambientIntensity: 100,
    tbox_toneMapping: 'aces', tbox_exposure: 105,
    tbox_fxaa: 'off', tbox_shadowSoft: 2, tbox_fogDensity: 100,
    tbox_bloomStrength: 50, tbox_csmEnabled: '0',
    tbox_motionBlur: '0', tbox_filmGrain: '0', tbox_colorGrade: '0',
    tbox_colorSaturation: 100, tbox_colorContrast: 100, tbox_colorBrightness: 100,
    tbox_perfMode: '0',
    tbox_fov: 120, tbox_view: 'fps', tbox_tpsDist: 45, tbox_tpsH: 16,
    tbox_camSmooth: '1', tbox_shake: 'high',
    tbox_sens: 22, tbox_mouseAccel: '0', tbox_invertY: '0', tbox_joyDead: 15,
    tbox_volMaster: 70, tbox_volSfx: 70, tbox_sfxOn: '1',
    tbox_showfps: 'off', tbox_showCoord: '0', tbox_showStance: '1',
    tbox_showCompass: '1',
    tbox_showCrosshair: '1', tbox_showHp: '1',
    tbox_compassOpacity: 100, tbox_compassPos: 'top',
    tbox_hudOpacity: 100, tbox_hudScale: 100,
    tbox_fpsPos: 'top-left', tbox_fpsSize: 11,
    tbox_hurtVignette: '1',
    tbox_chStyle: 'cross', tbox_chColor: 'white', tbox_chColorCustom: '#ffffff',
    tbox_chSize: 100, tbox_chThickness: 2, tbox_chGap: 8, tbox_chOpacity: 100,
    tbox_chDynamic: '1', tbox_chShadow: '1',
    tbox_showDmgNumber: '1', tbox_showDmgIcon: '1',
    tbox_hitStyle: 'cross', tbox_hitSize: 100, tbox_hitFloat: 60, tbox_dmgSize: 100,
    tbox_viewSway: '1', tbox_runShake: '1',
    tbox_swayAmount: 100, tbox_runShakeAmount: 100,
    tbox_hitShake: '1', tbox_hitFrame: '1',
    tbox_blinkFx: '1', tbox_slowMo: '1', tbox_desatFx: '1',
    tbox_vitals: '1', tbox_vitalsSound: '1',
    tbox_heartSound: '1', tbox_breathSound: '1',
    tbox_ambientSound: '1', tbox_killFeed: '1',
    tbox_hitDirection: '1', tbox_killIcon: '1',
    tbox_lowHpSound: '1', tbox_autoPickup: '1',
    tbox_joySens: 100, tbox_lookSens: 100,
    tbox_btnScale: 100, tbox_btnOpacity: 100, tbox_vibrate: '1',
    tbox_charName: 'Player',
    tbox_pauseOnBack: '0',
    tbox_fpsLimit: 60, tbox_autoSaveLayout: '1'
  }
};