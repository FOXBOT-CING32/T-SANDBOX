/* ============================================================
 * data.js · 数据系统
 * V1.0.0 · 第四阶段：角色自定义 2.0
 * ============================================================ */
window.TBOX = window.TBOX || {};

TBOX.DATA = {
  VERSION: (window.TBOX.VERSION && window.TBOX.VERSION.NUMBER) || '1.0.0',
  VERSION_LABEL: (window.TBOX.VERSION && window.TBOX.VERSION.LABEL) || 'V1.0.0 · Stable',
  BUILD: (window.TBOX.VERSION && window.TBOX.VERSION.BUILD) || 100,

  EYE_H: 1.55,
  EYE_H_CROUCH: 0.85,
  PLAYER_RADIUS: 0.35,
  PLAYER_HEIGHT: 1.60,

  WALK_SPEED: 2.8,
  RUN_SPEED: 5.5,
  SPRINT_SPEED: 8.5,
  CROUCH_SPEED: 2.0,

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

  RUN_SHAKE: {
    walkAmp: 0.012, runAmp: 0.022, sprintAmp: 0.035, speed: 12
  },

  VIEW_SHAKE: {
    hitAmpSmall: 0.20, hitAmpMid: 0.45, hitAmpLarge: 0.70,
    hitTimeSmall: 0.10, hitTimeMid: 0.18, hitTimeLarge: 0.28,
    attackAmp: 0.06, attackTime: 0.08
  },

  ARM_SHOULDER_X: 0.22,
  ARM_SHOULDER_Y: 1.34,
  ARM_SHOULDER_Z: 0.03,
  ARM_BASE_Z_ROT: 0.06,

  CROUCH_DROP: 0.55,
  CROUCH_LEAN: 0.0,
  CROUCH_KNEE: 1.85,
  CROUCH_HIP: -0.50,
  CROUCH_BODY_BEND: 0.0,
  CROUCH_HEAD_BEND: 0.0,
  CROUCH_FEET_ON_GROUND: true,
  CROUCH_ARM_FORWARD: 0.10,
  CROUCH_ARM_Z: 0.02,

  ATTACK_RANGE: 1.9,
  TARGET_HP: 5,

  ATK_DUR: {
    jab: 0.20, cross: 0.24, hookL: 0.40, hookR: 0.40,
    hammer: 0.40, palm: 0.26, elbowL: 0.30, elbowR: 0.30,
    leftKick: 0.46, rightKick: 0.46,
    push: 0.35, knee: 0.40
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

  SPRINT_ATK: {
    kickMul: 1.5, kickKnockBack: 4.0,
    pushMul: 1.75, pushForce: 14.0
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
    iframe: 0.3, cooldown: 0.3
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
  CLIMB_MAX_HEIGHT: 3.5,

  SLIDE_SIDE: {
    enabled: true, bodyDrop: 0.70, sideTilt: 0.45,
    twistAmount: 0.35, camRoll: 0.45, legSpreadY: 0.30,
    duration: 1.0, speed: 8.5
  },

  MAX_HP: 100, MAX_STAMINA: 100,
  HP_REGEN: 0, STAMINA_REGEN: 15,
  STAMINA_SPRINT_COST: 12, STAMINA_ATTACK_COST: 8, HP_DEATH: 0,

  HP_COLOR: {
    white: { min: 70, color: '#ffffff', status: '良好' },
    yellow: { min: 40, color: '#ffcc33', status: '轻伤' },
    red: { min: 1, color: '#ff3b5c', status: '重伤' },
    black: { min: 0, color: '#000000', status: '死亡' }
  },

  HURT_VIGNETTE: { light: 0.2, mid: 0.5, heavy: 0.8, dying: 1.0 },

  VITALS: {
    heartIdle: 72, heartWalk: 90, heartRun: 120, heartSprint: 150,
    heartCrouch: 65, heartClimb: 135,
    lungIdle: 14, lungWalk: 20, lungRun: 28, lungSprint: 36,
    lungCrouch: 12, lungClimb: 32,
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
    fallDur: 0.8, lieDur: 1.2,
    fadeStart: 1.0, fadeDur: 1.5,
    blinkStart: 1.5, blinkEnd: 2.5,
    respawnAt: 3.0, blackout: 3.0,
    dizzyRollAmp: 0.4, dizzySpeed: 4.0, dizzyBlur: 3.0
  },

  TINNITUS: { volume: 0.35, duration: 3.0 },
  RESPAWN_RADIUS: 10,

  ENEMY: {
    name: 'Enemy',
    hp: 15, maxHp: 15,
    attackRange: 1.7, detectRange: 999, attackCooldown: 0.45,
    moveSpeed: 3.0, damage: 5, respawnTime: 8.0,
    walkSpeed: 2.0, runSpeed: 4.5, sprintSpeed: 7.0,
    crouchSpeed: 1.2, slideSpeed: 8.0,
    dodgeChance: 0.75, dodgeCooldown: 1.2,
    slideChance: 0.75, chainSlideChance: 0.60,
    climbChance: 0.55, climbAfterStairs: 0.9,
    comboChance: 0.85, comboMax: 5,
    attackTypes: ['jab','cross','hookL','hookR','leftKick','rightKick','hammer','palm','elbowL','elbowR'],
    combatStyle: 'brawler', aggression: 0.95,
    attackOrientCheck: true, attackApproachDist: 1.4, attackFacingDot: 0.5,
    noAttackOnStair: true, stairCheckY: 0.8,
    blockChance: 0.5, blockCooldown: 1.5, blockDuration: 1.0, blockThreshold: 0.6,
    collideWithStairs: true, collisionRadius: 0.5,
    canPushPlayer: true, pushChance: 0.35, pushPlayerChance: 0.35,
    pushRange: 2.2, pushCooldown: 3.0, pushForce: 8.0
  },

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

  /* ============================================================
   * ★ 角色配置 2.0
   * 14 部位贴图 + 8 尺寸 + 每部位颜色/模式
   * ============================================================ */
  CHAR: {
    name: 'Player',

    /* --- 脸部贴图（头部单独，兼容旧字段 face） --- */
    face: '',
    faceColor: '#ffcda0',
    faceMode: 'overlay',  /* 'overlay' 叠加颜色 / 'texture' 贴图覆盖 */

    /* --- 14 部位贴图 --- */
    texTorso:      '',
    texArmL_upper: '',
    texArmL_lower: '',
    texArmR_upper: '',
    texArmR_lower: '',
    texHandL:      '',
    texHandR:      '',
    texLegL_upper: '',
    texLegL_lower: '',
    texLegR_upper: '',
    texLegR_lower: '',
    texFootL:      '',
    texFootR:      '',

    /* --- 每部位染色（用于黑白贴图上色） --- */
    colorTorso:    '#2b3a4a',
    colorArmL:     '#ffcda0',
    colorArmR:     '#ffcda0',
    colorHandL:    '#ffcda0',
    colorHandR:    '#ffcda0',
    colorLegL:     '#1a1a1a',
    colorLegR:     '#1a1a1a',
    colorFootL:    '#0a0a0a',
    colorFootR:    '#0a0a0a',

    /* --- 每部位模式：'overlay' 颜色叠加 / 'texture' 贴图覆盖 --- */
    modeTorso:    'overlay',
    modeArmL:     'overlay',
    modeArmR:     'overlay',
    modeHandL:    'overlay',
    modeHandR:    'overlay',
    modeLegL:     'overlay',
    modeLegR:     'overlay',
    modeFootL:    'overlay',
    modeFootR:    'overlay',

    /* --- 8 维度尺寸调节 --- */
    sizeHeight:     1.0,   /* 整体身高：0.8 ~ 1.3 */
    sizeHeadRatio:  1.0,   /* 头身比：0.7 ~ 1.5 */
    sizeShoulder:   1.0,   /* 肩宽：0.7 ~ 1.4 */
    sizeArmLength:  1.0,   /* 臂长：0.7 ~ 1.3 */
    sizeHandSize:   1.0,   /* 手部大小：0.7 ~ 1.5 */
    sizeLegLength:  1.0,   /* 腿长：0.7 ~ 1.3 */
    sizeFootSize:   1.0,   /* 脚部大小：0.7 ~ 1.5 */
    sizeBodyThick:  1.0,   /* 体厚：0.7 ~ 1.5 */

    /* --- 纹身（3 处，兼容旧版） --- */
    tattooArmL:    '',
    tattooArmR:    '',
    tattooChest:   '',
    tattooBack:    '',
    tattooColor:   '#111111',
    tattooSymbol:  '',

    /* --- 挂件（沿用旧版结构） --- */
    hat: 'none',
    glasses: 'none',
    mask: 'none',
    headphones: 'none',
    necklace: 'none',
    watch: 'none',
    backpack: 'none'
  },

  /* ============================================================
   * ★ 14 部位枚举（用于 UI 遍历）
   * ============================================================ */
  CHAR_TEXTURE_PARTS: [
    { id: 'face',         label: '脸部',     type: 'face' },
    { id: 'torso',        label: '躯干',     type: 'body' },
    { id: 'armL_upper',   label: '左上臂',   type: 'body' },
    { id: 'armL_lower',   label: '左小臂',   type: 'body' },
    { id: 'armR_upper',   label: '右上臂',   type: 'body' },
    { id: 'armR_lower',   label: '右小臂',   type: 'body' },
    { id: 'handL',        label: '左手',     type: 'body' },
    { id: 'handR',        label: '右手',     type: 'body' },
    { id: 'legL_upper',   label: '左大腿',   type: 'body' },
    { id: 'legL_lower',   label: '左小腿',   type: 'body' },
    { id: 'legR_upper',   label: '右大腿',   type: 'body' },
    { id: 'legR_lower',   label: '右小腿',   type: 'body' },
    { id: 'footL',        label: '左脚',     type: 'body' },
    { id: 'footR',        label: '右脚',     type: 'body' }
  ],

  /* ============================================================
   * ★ 8 尺寸范围
   * ============================================================ */
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

  /* ============================================================
   * ★ 5 标签页分组
   * ============================================================ */
  CHAR_TABS: [
    { id: 'head',  label: '头部', parts: ['face'] },
    { id: 'torso', label: '躯干', parts: ['torso'] },
    { id: 'arms',  label: '手臂', parts: ['armL_upper','armL_lower','armR_upper','armR_lower','handL','handR'] },
    { id: 'legs',  label: '腿脚', parts: ['legL_upper','legL_lower','legR_upper','legR_lower','footL','footR'] },
    { id: 'size',  label: '尺寸', parts: [] }
  ],

  /* ============================================================
   * ★ 预设颜色（用于快速取色）
   * ============================================================ */
  CHAR_PRESET_COLORS: [
    '#ffffff', '#000000', '#ff3b5c', '#ffcc33',
    '#4fd1ff', '#4fff7a', '#ff8c33', '#9c27b0',
    '#ffcda0', '#2b3a4a', '#1a1a1a', '#0a0a0a'
  ],

  /* ============================================================
   * 挂件列表（扩展版）
   * ============================================================ */
  ACCESSORIES: {
    hat: [
      { id: 'none',    name: '无' },
      { id: 'cap',     name: '鸭舌帽' },
      { id: 'helmet',  name: '头盔' },
      { id: 'crown',   name: '王冠' },
      { id: 'beanie',  name: '毛线帽' }
    ],
    glasses: [
      { id: 'none',   name: '无' },
      { id: 'normal', name: '普通' },
      { id: 'sun',    name: '墨镜' },
      { id: 'round',  name: '圆框' }
    ],
    mask: [
      { id: 'none',     name: '无' },
      { id: 'surgical', name: '医用' },
      { id: 'n95',      name: 'N95' },
      { id: 'bandana',  name: '头巾' }
    ],
    headphones: [
      { id: 'none',    name: '无' },
      { id: 'headset', name: '耳麦' }
    ],
    necklace: [
      { id: 'none',    name: '无' },
      { id: 'chain',   name: '金链' },
      { id: 'pendant', name: '吊坠' },
      { id: 'choker',  name: '颈圈' }
    ],
    watch: [
      { id: 'none',  name: '无' },
      { id: 'watch', name: '普通' },
      { id: 'band',  name: '腕带' }
    ],
    backpack: [
      { id: 'none',  name: '无' },
      { id: 'small', name: '小背包' },
      { id: 'large', name: '大背包' }
    ]
  },

  NET_AUDIO: {
    punch:      'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    kick:       'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    hit:        'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    death:      'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    hurt:       'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    tinnitus:   'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1e4c1f8e.mp3',
    heartbeat:  'https://cdn.pixabay.com/download/audio/2021/08/04/audio_1d84f6a2e4.mp3',
    breath:     'https://cdn.pixabay.com/download/audio/2022/03/24/audio_4c9a4f0b1c.mp3',
    ambientWind:'https://cdn.pixabay.com/download/audio/2022/01/18/audio_c9a1c4f3a9.mp3',
    ambientBird:'https://cdn.pixabay.com/download/audio/2022/01/18/audio_c9a1c4f3a9.mp3',
    uiClick:    'https://cdn.pixabay.com/download/audio/2021/08/04/audio_1d84f6a2e4.mp3',
    uiHover:    'https://cdn.pixabay.com/download/audio/2021/08/04/audio_1d84f6a2e4.mp3'
  },

  DEFAULT_SETTINGS: {
    tbox_quality: 'auto', tbox_resScale: 100, tbox_aa: 'off',
    tbox_lighting: '0', tbox_shadow: '0', tbox_shadowQ: 'mid',
    tbox_fog: '1', tbox_bloom: '0', tbox_vignette: '1', tbox_speedlines: '1',
    tbox_hdr: '0',
    tbox_fov: 120, tbox_view: 'fps', tbox_tpsDist: 45, tbox_tpsH: 16,
    tbox_camSmooth: '1', tbox_shake: 'high',
    tbox_sens: 22, tbox_mouseAccel: '0', tbox_invertY: '0', tbox_joyDead: 15,
    tbox_volMaster: 70, tbox_volSfx: 70, tbox_sfxOn: '1',
    tbox_showfps: 'off', tbox_showCoord: '0', tbox_showStance: '1',
    tbox_chStyle: 'cross', tbox_chColor: 'white', tbox_chSize: 100, tbox_chOpacity: 100,
    tbox_hudOpacity: 100, tbox_showCompass: '1',
    tbox_showCrosshair: '1', tbox_showHp: '1',
    tbox_compassOpacity: 100,
    tbox_dmgStyle: 'number', tbox_dmgSize: 100,
    tbox_hitStyle: 'cross', tbox_hitSize: 100,
    tbox_hurtVignette: '1',
    tbox_shakeAmount: 100,
    tbox_viewSway: '1', tbox_runShake: '1',
    tbox_swayAmount: 100, tbox_runShakeAmount: 100,
    tbox_hitShake: '1', tbox_hitFrame: '1',
    tbox_blinkFx: '1', tbox_slowMo: '1', tbox_desatFx: '1',
    tbox_vitals: '1', tbox_vitalsSound: '1',
    tbox_heartSound: '1', tbox_breathSound: '1',
    tbox_ambientSound: '1',
    tbox_killFeed: '1',
    tbox_charName: 'Player',
    tbox_lang: 'zh', tbox_pauseOnBack: '0', tbox_timeScale: 100,
    tbox_fpsLimit: 60, tbox_autoSaveLayout: '1'
  },

  TEXT: {
    zh: {
      device: '设备：', version: '版本：', close: '关闭', reset: '重置设置', on: '开', off: '关',
      confirm: '确定', cancel: '取消',
      start: '开始游戏', settings: '设置', controls: '操作', about: '关于',
      charEditor: '角色编辑', layoutEditor: '布局编辑',
      subtitle: 'T-BOX · PROS SANDBOX',
      hiddenText: 'Hidden Area · 你找到了隐藏区域',
      settingsTitle: '设置 · Settings',
      graphics: '画面', quality: '画质',
      qualityLow: '低', qualityMid: '中', qualityHigh: '高', qualityUltra: '超', qualityAuto: '自动',
      resolution: '分辨率缩放', aa: '抗锯齿', aaLow: '低', aaHigh: '高',
      lighting: '光影', shadow: '影子', shadowQ: '影子质量', fog: '雾效',
      bloom: '泛光', vignette: '暗角', speedLines: '速度线', hdr: 'HDR',
      camera: '相机', fov: '视场角', defaultView: '默认视角',
      tpsDist: '第三人称距离', tpsH: '第三人称高度', camSmooth: '相机平滑', viewShake: '视角震动',
      shakeOff: '关', shakeLow: '低', shakeMid: '中', shakeHigh: '高',
      viewSection: '视角',
      viewSway: '微动视角', swayAmount: '微动幅度',
      runShake: '跑步视角晃动', runShakeAmount: '跑步晃动幅度',
      hitShake: '受击晃动', hitFrame: '受击黑边',
      blinkFx: '濒死眨眼', slowMo: '濒死慢动作', desatFx: '重伤去饱和',
      vitalsSection: '生命监测',
      vitalsShow: '心跳/呼吸检测仪', vitalsSound: '监测音效',
      heartSound: '心跳声', breathSound: '呼吸声',
      ambientSound: '环境音',
      killFeed: '击杀提示',
      charSection: '角色',
      charName: '角色名字',
      opSection: '操作', sens: '灵敏度', mouseAccel: '鼠标加速',
      invertY: '反转 Y 轴', joyDead: '摇杆死区',
      audio: '音频', volMaster: '主音量', volSfx: '音效音量', sfxOn: '音效开关',
      uiSection: '界面', showFps: '显示帧率', showCoord: '显示坐标',
      showStance: '显示状态', showCompass: '显示罗盘',
      showCrosshair: '显示准星', showHp: '显示血量',
      chStyle: '准星样式', chCross: '十字', chDot: '点', chCircle: '圆', chCrossDot: '十字点',
      chColor: '准星颜色', chWhite: '白', chRed: '红', chGreen: '绿', chYellow: '黄',
      chBlue: '蓝', chCyan: '青', chMagenta: '品红',
      chSize: '准星大小', chOpacity: '准星透明度',
      compassOpacity: '罗盘透明度',
      dmgStyle: '伤害数字', dmgNumber: '数字', dmgOff: '关', dmgSize: '伤害数字大小',
      hitStyle: '命中标记', hitCross: '十字', hitDot: '点', hitSize: '命中标记大小',
      hurtVignette: '受伤红晕',
      hudOpacity: '界面透明度', shakeAmount: '相机摇晃强度',
      other: '其他', lang: '语言', langZh: '中文', langEn: '英文',
      timeScale: '游戏时间速度', pauseOnBack: '返回时暂停',
      fpsLimit: '帧率上限', autoSaveLayout: '自动保存布局',
      unlimited: '无限制',

      /* ★ 角色编辑相关 */
      charTabHead: '头部', charTabTorso: '躯干', charTabArms: '手臂',
      charTabLegs: '腿脚', charTabSize: '尺寸',
      charNameLabel: '角色名字',
      charFace: '脸部贴图',
      charUpload: '上传',
      charUrl: '或 URL',
      charColor: '颜色',
      charMode: '模式',
      charModeOverlay: '叠加',
      charModeTexture: '覆盖',
      charClear: '清除',
      charPartTorso: '躯干',
      charPartArmLUpper: '左上臂',
      charPartArmLLower: '左小臂',
      charPartArmRUpper: '右上臂',
      charPartArmRLower: '右小臂',
      charPartHandL: '左手',
      charPartHandR: '右手',
      charPartLegLUpper: '左大腿',
      charPartLegLLower: '左小腿',
      charPartLegRUpper: '右大腿',
      charPartLegRLower: '右小腿',
      charPartFootL: '左脚',
      charPartFootR: '右脚',
      charSizeHeight: '整体身高',
      charSizeHeadRatio: '头身比',
      charSizeShoulder: '肩宽',
      charSizeArmLength: '臂长',
      charSizeHandSize: '手部大小',
      charSizeLegLength: '腿长',
      charSizeFootSize: '脚部大小',
      charSizeBodyThick: '体厚',
      charHat: '帽子', charGlasses: '眼镜', charMask: '口罩',
      charHeadphones: '耳机', charNecklace: '项链', charWatch: '手表', charBackpack: '背包',
      charSave: '保存', charReset: '重置', charBack: '返回',
      charSaved: '角色已保存',
      charResetDone: '角色已重置',
      charUploadFail: '上传失败',
      charNoFace: '无',
      charAccessoryNone: '无',
      charAccessoryCap: '鸭舌帽',
      charAccessoryHelmet: '头盔',
      charAccessoryCrown: '王冠',
      charAccessoryBeanie: '毛线帽',
      charAccessoryNormal: '普通',
      charAccessorySun: '墨镜',
      charAccessoryRound: '圆框',
      charAccessorySurgical: '医用',
      charAccessoryN95: 'N95',
      charAccessoryBandana: '头巾',
      charAccessoryHeadset: '耳麦',
      charAccessoryChain: '金链',
      charAccessoryPendant: '吊坠',
      charAccessoryChoker: '颈圈',
      charAccessoryWatch: '普通',
      charAccessoryBand: '腕带',
      charAccessoryBackpackS: '小背包',
      charAccessoryBackpackL: '大背包',
      charPreview: '预览',
      charPreviewHint: '拖动旋转 · 滚轮缩放',
      charTattoo: '纹身',
      charTattooArmL: '左臂',
      charTattooArmR: '右臂',
      charTattooChest: '胸口',
      charTattooBack: '背部',
      charTattooSymbol: '符号',

      controlsTitle: '操作 · Controls',
      controlsDesktop: '桌面端（键盘 + 鼠标）', controlsMobile: '移动端（触屏）',
      ctrlMove: '移动', ctrlSprint: '冲刺', ctrlCrouch: '蹲下', ctrlKnee: '膝撞',
      ctrlJump: '跳跃', ctrlBigJump: '大跳', ctrlClimb: '攀爬',
      ctrlLMB_RMB: '左直 / 右直', ctrlV_B: '左勾 / 右勾',
      ctrlM_Comma: '锤拳 / 掌击', ctrlG_H: '左肘 / 右肘',
      ctrlQ_R_E: '左踢 / 右踢 / 推人', ctrlF: '格挡', ctrlI: '检视',
      ctrlT: '切换视角', ctrlESC: '返回菜单', ctrlView: '视角',
      ctrlJoy: '左下角移动区', ctrlLook: '右侧滑动', ctrlBtns: '攻击 / 动作', ctrlBtns2: '屏幕两侧按钮',

      aboutTitle: '关于 · About', aboutVersion: '版本', aboutType: '类型',
      aboutTypeVal: '第一人称 / 第三人称 方块沙盒',
      aboutOpenSource: '本项目为开源学习项目，基于 MIT 协议开源。',
      aboutNoCopy: '仅供学习参考，请勿直接照搬、盗用、商用。',
      aboutSource: '如需使用代码，请注明来源。',
      aboutDisclaimer: '本项目并非独立创作，仅为学习参考。如有侵犯任何第三方权益，请联系删除。',
      pcHud: 'WASD 移动 · SHIFT 冲刺 · C 蹲下 · CTRL 膝撞<br>SPACE 跳 · SHIFT+SPACE 大跳 · N 攀爬<br>LMB 左直 · RMB 右直 · V 左勾 · B 右勾<br>M 锤拳 · , 掌击 · G 左肘 · H 右肘<br>Q 左正踢 · E 推人 · R 右正踢 · F 格挡<br>双击A/D 闪避 · 双击S 后闪 · SHIFT+C 滑铲<br>I 检视 · T 视角 · ESC 返回菜单',
      stanceIdle: 'STANCE · IDLE', stanceWalk: 'STANCE · WALK', stanceRun: 'STANCE · RUN',
      stanceSprint: 'STANCE · SPRINT', stanceCrouch: 'STANCE · CROUCH', stanceClimb: 'STANCE · CLIMB',
      stanceBlock: 'STANCE · BLOCK', stanceDodge: 'STANCE · DODGE',
      camFps: 'CAM · FPS', camTps: 'CAM · TPS',
      backMenu: '菜单',
      backResume: '返回游戏', backSettings: '设置', backControls: '操作',
      backAbout: '关于', backQuit: '退出',
      editLayout: '编辑布局', editDone: '完成', editAuto: '自动布局',
      editReset: '重置', editBack: '返回',
      editHint: '拖动按钮调整位置',
      toastEditSaved: '布局已保存',
      toastEditAuto: '已应用自动布局',
      toastEditReset: '布局已重置',
      toastCharSaved: '角色已保存',
      toastCharReset: '角色已重置',
      btnJab: '左直', btnHook: '左勾', btnElbowL: '左肘', btnElbowR: '右肘',
      btnLeftKick: '左踢', btnRightKick: '右踢', btnBackSpin: '推人',
      btnCrouch: '蹲', btnSprint: '冲刺', btnKnee: '膝撞',
      btnCross: '右直', btnHookR: '右勾', btnClimb: '攀爬',
      btnHammer: '锤拳', btnPalm: '掌击', btnJump: '跳',
      btnInspect: '检视', btnView: '视角', btnBlock: '格挡',
      youDied: '',
      hpGood: '良好', hpLight: '轻伤', hpHeavy: '重伤', hpDead: '死亡',
      hpText: '血量', staminaText: '耐力', statusText: '状态',
      heartText: '心跳', lungText: '呼吸',
      killFeedKill: '击杀', killFeedKilledBy: '被击杀',
      toastDevMode: 'Developer Mode · T-BOX Team',
      toastKonami: 'Konami Code · 30 条命已到账',
      toastRainbow: 'Rainbow Mode',
      toastAccess: 'Access Granted · T-BOX',
      toastHidden: 'Hidden Area · 你发现了隐藏区域',
      toastReset: '设置已重置 · 刷新中…',
      toastDevStart: 'Developer Mode · 即将进入调试',
      toastVersion: 'V1.0.0 · Stable',
      toastDevice: '设备',
      toastClimbNo: '前方没有可攀爬的台阶',
      confirmReset: '确定要重置所有设置吗？',
      confirmResetLayout: '确定要重置 UI 布局吗？',
      perfWarnTitle: '⚠ 性能警告',
      perfWarnLow: '当前设备性能评级为「低」，开启超画质或 HDR 可能严重掉帧',
      perfWarnMid: '当前设备性能评级为「中」，开启超画质或 HDR 可能掉帧'
    },
    en: {
      device: 'Device: ', version: 'Version: ', close: 'CLOSE', reset: 'RESET', on: 'On', off: 'Off',
      confirm: 'OK', cancel: 'Cancel',
      start: 'START GAME', settings: 'SETTINGS', controls: 'CONTROLS', about: 'ABOUT',
      charEditor: 'Character', layoutEditor: 'Layout',
      subtitle: 'T-BOX · PROS SANDBOX',
      hiddenText: 'Hidden Area · You found the hidden area',
      settingsTitle: 'SETTINGS · 设置',
      graphics: 'GRAPHICS', quality: 'Quality',
      qualityLow: 'Low', qualityMid: 'Mid', qualityHigh: 'High', qualityUltra: 'Ultra', qualityAuto: 'Auto',
      resolution: 'Resolution Scale', aa: 'Anti-Aliasing', aaLow: 'Low', aaHigh: 'High',
      lighting: 'Lighting', shadow: 'Shadow', shadowQ: 'Shadow Quality', fog: 'Fog',
      bloom: 'Bloom', vignette: 'Vignette', speedLines: 'Speed Lines', hdr: 'HDR',
      camera: 'CAMERA', fov: 'FOV', defaultView: 'Default View',
      tpsDist: 'TPS Distance', tpsH: 'TPS Height', camSmooth: 'Camera Smooth', viewShake: 'View Shake',
      shakeOff: 'Off', shakeLow: 'Low', shakeMid: 'Mid', shakeHigh: 'High',
      viewSection: 'VIEW',
      viewSway: 'View Sway', swayAmount: 'Sway Amount',
      runShake: 'Run Shake', runShakeAmount: 'Run Shake Amount',
      hitShake: 'Hit Shake', hitFrame: 'Hit Frame',
      blinkFx: 'Blink FX', slowMo: 'Slow-Mo', desatFx: 'Desaturation',
      vitalsSection: 'VITALS',
      vitalsShow: 'Vitals Monitor', vitalsSound: 'Vitals Sound',
      heartSound: 'Heartbeat', breathSound: 'Breathing',
      ambientSound: 'Ambient Sound',
      killFeed: 'Kill Feed',
      charSection: 'CHARACTER',
      charName: 'Character Name',
      opSection: 'CONTROLS', sens: 'Sensitivity', mouseAccel: 'Mouse Accel',
      invertY: 'Invert Y', joyDead: 'Joystick Deadzone',
      audio: 'AUDIO', volMaster: 'Master Volume', volSfx: 'SFX Volume', sfxOn: 'SFX Toggle',
      uiSection: 'INTERFACE', showFps: 'Show FPS', showCoord: 'Show Coords',
      showStance: 'Show Stance', showCompass: 'Show Compass',
      showCrosshair: 'Show Crosshair', showHp: 'Show HP',
      chStyle: 'Crosshair Style', chCross: 'Cross', chDot: 'Dot', chCircle: 'Circle', chCrossDot: 'Cross-Dot',
      chColor: 'Crosshair Color', chWhite: 'White', chRed: 'Red', chGreen: 'Green', chYellow: 'Yellow',
      chBlue: 'Blue', chCyan: 'Cyan', chMagenta: 'Magenta',
      chSize: 'Crosshair Size', chOpacity: 'Crosshair Opacity',
      compassOpacity: 'Compass Opacity',
      dmgStyle: 'Damage Numbers', dmgNumber: 'Number', dmgOff: 'Off', dmgSize: 'Damage Number Size',
      hitStyle: 'Hit Marker', hitCross: 'Cross', hitDot: 'Dot', hitSize: 'Hit Marker Size',
      hurtVignette: 'Hurt Vignette',
      hudOpacity: 'HUD Opacity', shakeAmount: 'Camera Shake Amount',
      other: 'OTHER', lang: 'Language', langZh: 'Chinese', langEn: 'English',
      timeScale: 'Time Scale', pauseOnBack: 'Pause On Back',
      fpsLimit: 'FPS Limit', autoSaveLayout: 'Auto Save Layout',
      unlimited: 'Unlimited',

      charTabHead: 'Head', charTabTorso: 'Torso', charTabArms: 'Arms',
      charTabLegs: 'Legs', charTabSize: 'Size',
      charNameLabel: 'Character Name',
      charFace: 'Face Texture',
      charUpload: 'Upload',
      charUrl: 'or URL',
      charColor: 'Color',
      charMode: 'Mode',
      charModeOverlay: 'Overlay',
      charModeTexture: 'Texture',
      charClear: 'Clear',
      charPartTorso: 'Torso',
      charPartArmLUpper: 'L Upper Arm',
      charPartArmLLower: 'L Lower Arm',
      charPartArmRUpper: 'R Upper Arm',
      charPartArmRLower: 'R Lower Arm',
      charPartHandL: 'L Hand',
      charPartHandR: 'R Hand',
      charPartLegLUpper: 'L Thigh',
      charPartLegLLower: 'L Shin',
      charPartLegRUpper: 'R Thigh',
      charPartLegRLower: 'R Shin',
      charPartFootL: 'L Foot',
      charPartFootR: 'R Foot',
      charSizeHeight: 'Height',
      charSizeHeadRatio: 'Head Ratio',
      charSizeShoulder: 'Shoulder',
      charSizeArmLength: 'Arm Length',
      charSizeHandSize: 'Hand Size',
      charSizeLegLength: 'Leg Length',
      charSizeFootSize: 'Foot Size',
      charSizeBodyThick: 'Body Thickness',
      charHat: 'Hat', charGlasses: 'Glasses', charMask: 'Mask',
      charHeadphones: 'Headphones', charNecklace: 'Necklace', charWatch: 'Watch', charBackpack: 'Backpack',
      charSave: 'Save', charReset: 'Reset', charBack: 'Back',
      charSaved: 'Character saved',
      charResetDone: 'Character reset',
      charUploadFail: 'Upload failed',
      charNoFace: 'None',
      charAccessoryNone: 'None',
      charAccessoryCap: 'Cap',
      charAccessoryHelmet: 'Helmet',
      charAccessoryCrown: 'Crown',
      charAccessoryBeanie: 'Beanie',
      charAccessoryNormal: 'Normal',
      charAccessorySun: 'Sunglasses',
      charAccessoryRound: 'Round',
      charAccessorySurgical: 'Surgical',
      charAccessoryN95: 'N95',
      charAccessoryBandana: 'Bandana',
      charAccessoryHeadset: 'Headset',
      charAccessoryChain: 'Chain',
      charAccessoryPendant: 'Pendant',
      charAccessoryChoker: 'Choker',
      charAccessoryWatch: 'Watch',
      charAccessoryBand: 'Band',
      charAccessoryBackpackS: 'Small',
      charAccessoryBackpackL: 'Large',
      charPreview: 'Preview',
      charPreviewHint: 'Drag to rotate · Scroll to zoom',
      charTattoo: 'Tattoo',
      charTattooArmL: 'L Arm',
      charTattooArmR: 'R Arm',
      charTattooChest: 'Chest',
      charTattooBack: 'Back',
      charTattooSymbol: 'Symbol',

      controlsTitle: 'CONTROLS · 操作',
      controlsDesktop: 'Desktop (Keyboard + Mouse)', controlsMobile: 'Mobile (Touch)',
      ctrlMove: 'Move', ctrlSprint: 'Sprint', ctrlCrouch: 'Crouch', ctrlKnee: 'Knee',
      ctrlJump: 'Jump', ctrlBigJump: 'Big Jump', ctrlClimb: 'Climb',
      ctrlLMB_RMB: 'Jab / Cross', ctrlV_B: 'HookL / HookR',
      ctrlM_Comma: 'Hammer / Palm', ctrlG_H: 'ElbowL / ElbowR',
      ctrlQ_R_E: 'LeftKick / RightKick / Push', ctrlF: 'Block', ctrlI: 'Inspect',
      ctrlT: 'Toggle View', ctrlESC: 'Back to Menu', ctrlView: 'View',
      ctrlJoy: 'Bottom-Left Move Zone', ctrlLook: 'Right Side Swipe', ctrlBtns: 'Attack / Action', ctrlBtns2: 'Screen Side Buttons',

      aboutTitle: 'ABOUT · 关于', aboutVersion: 'Version', aboutType: 'Type',
      aboutTypeVal: 'FPS / TPS Block Sandbox',
      aboutOpenSource: 'Open-source project under MIT License.',
      aboutNoCopy: 'For learning reference only. Do not copy or resell.',
      aboutSource: 'Please credit the source if you use the code.',
      aboutDisclaimer: 'This is not an original work. For learning only. If any rights are infringed, please contact for removal.',
      pcHud: 'WASD Move · SHIFT Sprint · C Crouch · CTRL Knee<br>SPACE Jump · SHIFT+SPACE Big Jump · N Climb<br>LMB Jab · RMB Cross · V HookL · B HookR<br>M Hammer · , Palm · G ElbowL · H ElbowR<br>Q LeftKick · E Push · R RightKick · F Block<br>Double A/D Dodge · Double S Back · SHIFT+C Slide<br>I Inspect · T View · ESC Menu',
      stanceIdle: 'STANCE · IDLE', stanceWalk: 'STANCE · WALK', stanceRun: 'STANCE · RUN',
      stanceSprint: 'STANCE · SPRINT', stanceCrouch: 'STANCE · CROUCH', stanceClimb: 'STANCE · CLIMB',
      stanceBlock: 'STANCE · BLOCK', stanceDodge: 'STANCE · DODGE',
      camFps: 'CAM · FPS', camTps: 'CAM · TPS',
      backMenu: 'MENU',
      backResume: 'RESUME', backSettings: 'SETTINGS', backControls: 'CONTROLS',
      backAbout: 'ABOUT', backQuit: 'QUIT',
      editLayout: 'Edit Layout', editDone: 'Done', editAuto: 'Auto Layout',
      editReset: 'Reset', editBack: 'Back',
      editHint: 'Drag buttons to reposition',
      toastEditSaved: 'Layout saved',
      toastEditAuto: 'Auto layout applied',
      toastEditReset: 'Layout reset',
      toastCharSaved: 'Character saved',
      toastCharReset: 'Character reset',
      btnJab: 'Jab', btnHook: 'HookL', btnElbowL: 'ElbowL', btnElbowR: 'ElbowR',
      btnLeftKick: 'LeftKick', btnRightKick: 'RightKick', btnBackSpin: 'Push',
      btnCrouch: 'Crouch', btnSprint: 'Sprint', btnKnee: 'Knee',
      btnCross: 'Cross', btnHookR: 'HookR', btnClimb: 'Climb',
      btnHammer: 'Hammer', btnPalm: 'Palm', btnJump: 'Jump',
      btnInspect: 'Inspect', btnView: 'View', btnBlock: 'Block',
      youDied: '',
      hpGood: 'Good', hpLight: 'Light', hpHeavy: 'Heavy', hpDead: 'Dead',
      hpText: 'HP', staminaText: 'Stamina', statusText: 'Status',
      heartText: 'Heart', lungText: 'Lung',
      killFeedKill: 'killed', killFeedKilledBy: 'was killed by',
      toastDevMode: 'Developer Mode · T-BOX Team',
      toastKonami: 'Konami Code · 30 lives granted',
      toastRainbow: 'Rainbow Mode',
      toastAccess: 'Access Granted · T-BOX',
      toastHidden: 'Hidden Area · You found the hidden area',
      toastReset: 'Settings reset · Reloading…',
      toastDevStart: 'Developer Mode · Entering debug',
      toastVersion: 'V1.0.0 · Stable',
      toastDevice: 'Device',
      toastClimbNo: 'No climbable stairs ahead',
      confirmReset: 'Reset all settings?',
      confirmResetLayout: 'Reset UI layout?',
      perfWarnTitle: '⚠ PERFORMANCE WARNING',
      perfWarnLow: 'Device rated LOW. Ultra/HDR may drop frames heavily.',
      perfWarnMid: 'Device rated MID. Ultra/HDR may drop frames.'
    }
  }
};