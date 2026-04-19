// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG = {
  // Player
  playerSpeed:     180,
  playerHp:        100,
  playerRadius:    14,
  playerIframes:   0.6,   // invincibiliteit in seconden na een treffer
  contactDamage:   10,    // schade bij aanraking met gans

  // Enemy
  enemyBaseHp:     3,
  enemyBaseSpeed:  70,
  enemySlowFactor: 0.4,   // snelheidsmultiplier bij thermos-slow
  maxEnemyRadius:  16,    // max vijand-radius zodat geen enkele gans vastzit in smalle doorgangen
  maxEnemies:      80,    // safety cap: max totaal aantal enemies tegelijk
  maxBossProj:     12,    // safety cap: max boss-projectielen tegelijk

  // Wereld
  mapWidth:  1600,
  mapHeight: 1200,

  // Wave pauze
  waveBreakDuration: 1.0,   // seconden pauze na het verslaan van alle vijanden

  // Spawn afstand (minimale afstand vaste spawnpunten t.o.v. speler)
  spawnMinDist: 350,

  // Enemy separation
  separationDist:  28,    // afstand waaronder ganzen elkaar wegduwen (pixels)
  separationStr:   60,    // kracht van de wegduw (pixels/s)

  // Wapens (losse waarden die niet in WEAPON_DEFS staan)
  thermosSpeed:    200,   // projectielsnelheid thermos

  // Upgrades
  hpUpgrade:       15,    // Max HP +X per upgrade
  speedUpgrade:    1.1,   // snelheid ×X per upgrade
  healUpgrade:     40,    // herstel X HP per upgrade

  // Audio volumes (0.0 – 1.0)
  volumeMusic:     0.2,
  volumeAuw:       1.0,
  volumeVerlies:       1.0,
  volumeGanzenwinnen:  1.0,
  volumeParaplu:   1.0,
  volumeGum:       1.0,
  volumeGans:      1.0,
  volumeBoek:      0.5,
  volumePasser:    1.0,
  volumeLineaal:   1.0,
  volumeRugzak:    1.0,
  volumeThermos:   1.0,
  volumeBaasgans:  1.0,
  volumeGanspoep:  1.0,
};

// ─── Sound & Highscore ───────────────────────────────────────────────────────
let soundEnabled = true;
let DEBUG = false;

function loadHighscore() {
  return {
    wave: parseInt(localStorage.getItem('hs_wave') || '0'),
    time: parseInt(localStorage.getItem('hs_time') || '0'),
  };
}
function saveHighscore(w, t) {
  const hs = loadHighscore();
  if (w > hs.wave) localStorage.setItem('hs_wave', w);
  if (t > hs.time) localStorage.setItem('hs_time', t);
}
function updateHighscoreBox() {
  const hs = loadHighscore();
  const box = document.getElementById('highscore-box');
  box.textContent = hs.wave > 0
    ? `Beste wave: ${hs.wave}  |  Beste tijd: ${hs.time}s`
    : '';
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 600;

// ─── Audio ───────────────────────────────────────────────────────────────────
const MUSIC_TRACKS = {
  main: new Audio('Sounds/Kwakkwak1.mp3'),
  jazz: new Audio('Sounds/Kwakkwakjazz.mp3'),
};
Object.values(MUSIC_TRACKS).forEach(t => { t.volume = CONFIG.volumeMusic; });

let musicPlayCount = 0;  // telt hoe vaak 'main' gespeeld is
MUSIC_TRACKS.main.addEventListener('ended', () => {
  musicPlayCount++;
  if (musicPlayCount >= 3) { musicPlayCount = 0; MUSIC_TRACKS.jazz.play(); }
  else { MUSIC_TRACKS.main.play(); }
});
MUSIC_TRACKS.jazz.addEventListener('ended', () => { MUSIC_TRACKS.main.play(); });

const sfxAuw          = new Audio('Sounds/Auw.wav');
const sfxVerlies      = new Audio('Sounds/Verlies.wav');
const sfxGanzenwinnen = new Audio('Sounds/Ganzenwinnen.wav');
sfxAuw.volume          = CONFIG.volumeAuw;
sfxVerlies.volume      = CONFIG.volumeVerlies;
sfxGanzenwinnen.volume = CONFIG.volumeGanzenwinnen;
const sfxParaplu = new Audio('Sounds/Paraplu.wav');
const sfxGum     = new Audio('Sounds/Gum.wav');
const sfxGans    = new Audio('Sounds/Gans.wav');
const sfxBoek    = new Audio('Sounds/Boek.wav');
const sfxPasser  = new Audio('Sounds/Passer1.wav');
const sfxLiniaal = new Audio('Sounds/Lineaal.wav');
const sfxRugzak  = new Audio('Sounds/Rugzak.wav');
const sfxThermos = new Audio('Sounds/Thermos.wav');
sfxParaplu.volume = CONFIG.volumeParaplu;
sfxGum.volume     = CONFIG.volumeGum;
sfxGans.volume    = CONFIG.volumeGans;
sfxBoek.volume    = CONFIG.volumeBoek;
sfxPasser.volume  = CONFIG.volumePasser;
sfxLiniaal.volume = CONFIG.volumeLineaal;
sfxRugzak.volume  = CONFIG.volumeRugzak;
sfxThermos.volume = CONFIG.volumeThermos;
const sfxBaasgans = new Audio('Sounds/Baasgans.wav');
const sfxGanspoep = new Audio('Sounds/Ganspoep.mp3');
sfxBaasgans.volume = CONFIG.volumeBaasgans;
sfxGanspoep.volume = CONFIG.volumeGanspoep;
function playSound(sfx) {
  if (!soundEnabled) return;
  const clone = sfx.cloneNode();
  clone.volume = sfx.volume;
  clone.playbackRate = 0.95 + Math.random() * 0.1;
  clone.play();
}

const WEAPON_SFX = { paraplu: sfxParaplu, gum: sfxGum, gans: sfxGans,
                     boek: sfxBoek, passer: sfxPasser, liniaal: sfxLiniaal,
                     rugzak: sfxRugzak, thermos: sfxThermos };
function playSfx(id) { if (WEAPON_SFX[id]) playSound(WEAPON_SFX[id]); }

// Subtle timing jitter (±4%) to make weapon cadence feel organic
function jitter(t) { return t * (0.98 + Math.random() * 0.04); }

// ─── Setup ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

const elHP             = document.getElementById('hp');
const elWave           = document.getElementById('wave');
const elTimer          = document.getElementById('timer');
const overlay          = document.getElementById('overlay');
const overlayTitle     = document.getElementById('overlay-title');
const overlayMsg       = document.getElementById('overlay-message');
const overlayBtn       = document.getElementById('overlay-btn');
const levelPanel       = document.getElementById('level-up-panel');
const waveCompleteTitle = document.getElementById('wave-complete-title');
const upgradeOpts      = document.getElementById('upgrade-options');

// ─── Enemy types ─────────────────────────────────────────────────────────────
const ENEMY_TYPES = {
  normal: { hpMult: 1.0, speedMult: 1.0, sizeMult: 1.0,  color: null,      ignoresObstacles: false },
  tank:   { hpMult: 3.5, speedMult: 0.6, sizeMult: 1.5,  color: '#8d6e14', ignoresObstacles: false },
  flyer:    { hpMult: 0.7, speedMult: 1.4,  sizeMult: 0.85, color: '#9b59b6', ignoresObstacles: true  },
  bossGoose:{ hpMult: 4,   speedMult: 1.3,  sizeMult: 2.6,  color: '#8B0000', ignoresObstacles: false },
};

// ─── Weapon definitions ───────────────────────────────────────────────────────
// Each weapon has levels 1-5. Stats are arrays indexed by (level - 1).
const WEAPON_DEFS = {
  paraplu: {
    label: 'Paraplu',
    maxLevel: 5,
    // [reach, arc, dmg, rate, special]
    reach:  [75,  82,  90,  98, 110],
    arc:    [0.8, 0.9, 1.0, 1.2, 1.5].map(x => x * Math.PI),
    dmg:    [3,   4,   6,   7,   9],
    rate:   [0.55,0.7, 0.85,1.0, 1.2],
    double: [false,false,false,false,true],  // level 5: double swing
  },
  boek: {
    label: 'Boekenworp',
    maxLevel: 5,
    dmg:      [2, 3, 5, 7, 10],
    rate:     [0.4, 0.55, 0.7, 0.9, 1.1],
    piercing: [false, false, true, true, true],
    speed:    [300, 320, 340, 360, 400],
  },
  passer: {
    label: 'Passer',
    maxLevel: 5,
    dmg:      [2, 3, 5, 7, 9],
    reach:    [70, 80, 90, 100, 115],
    interval: [4, 3.2, 2.5, 2.0, 1.4],
  },
  gum: {
    label: 'Gum',
    maxLevel: 5,
    dmg:      [1, 1, 2, 2, 3],
    rate:     [0.7, 1.0, 1.5, 2.2, 3.8],
    bounces:  [0, 1, 1, 2, 3],
    speed:    [350, 370, 390, 410, 440],
  },
  thermos: {
    label: 'Thermosbeker',
    maxLevel: 5,
    dmg:      [2, 3, 4, 6, 8],
    rate:     [0.35, 0.5, 0.65, 0.8, 1.0],
    slow:     [3, 3, 4, 4, 5],
    splash:   [false, false, false, true, true],
    splashR:  [0, 0, 0, 40, 55],
  },
  liniaal: {
    label: 'Liniaal',
    maxLevel: 5,
    dmg:      [5, 7, 9, 12, 16],
    rate:     [0.6, 0.75, 0.9, 1.1, 1.3],
    length:   [120, 140, 160, 190, 220],
    width:    [10, 12, 14, 17, 22],
  },
  rugzak: {
    label: 'Rugzak smijten',
    maxLevel: 5,
    dmg:      [4, 6, 8, 10, 14],
    rate:     [0.25, 0.35, 0.45, 0.55, 0.65],
    splashR:  [35, 42, 50, 60, 75],
    speed:    [160, 170, 180, 195, 210],
  },
};

// ─── State ───────────────────────────────────────────────────────────────────
let state       = 'idle';
let lastTime    = 0;
let elapsed     = 0;
let wave        = 1;
let wavePhase          = 'fighting';
let waveMessage        = null;
let betweenWavesTimer  = 0;
let graceTimer         = 0;   // seconden waarbij vijanden op gereduceerde snelheid bewegen

const player = {
  x: CANVAS_W / 2, y: CANVAS_H / 2,
  r: CONFIG.playerRadius,
  hp: CONFIG.playerHp, maxHp: CONFIG.playerHp,
  speed: CONFIG.playerSpeed,
  facingAngle: 0,
  invincible: 0,
  vx: 0, vy: 0,   // bewegingsrichting voor boss-intercept

  // Active weapons: weaponId -> level (1-based)
  weapons: { paraplu: 1 },

  // Per-weapon cooldowns / active state
  cooldowns: {},
  swing:     null,   // paraplu swing { angle, progress, duration, hitSet }
  spinSwing: null,   // passer spin   { progress, duration, hitSet }
  liniaalFlash: null, // { angle, progress, duration, hitSet }
};

const camera    = { x: 0, y: 0 };

// ─── Map image ────────────────────────────────────────────────────────────────
const mapImage = new Image();
mapImage.src = 'speelveldfinal.png';

// Obstakels in 1600×1200 wereldruimte — coördinaten ingemeten via debug-overlay
const obstacles = [
  // Bovenwand
  { x: 0,    y: 0,    w: 1432, h: 40   },
  // Gebouw rechts
  { x: 1432, y: 0,    w: 168,  h: 1200 },
  // Auto 1 (grijs linksboven)
  { x: 14,   y: 114,  w: 144,  h: 85   },
  // Auto 2 (oranje)
  { x: 14,   y: 337,  w: 138,  h: 84   },
  // Auto 3 (groen)
  { x: 14,   y: 871,  w: 138,  h: 112  },
  // Bankje linksboven (horizontaal)
  { x: 291,  y: 176,  w: 186,  h: 72   },
  // Bankje midden-links (verticaal)
  { x: 679,  y: 376,  w: 72,   h: 187  },
  // Bankje midden (horizontaal)
  { x: 498,  y: 665,  w: 186,  h: 72   },
  // Bankje rechtsonder (verticaal)
  { x: 1272, y: 736,  w: 60,   h: 192  },
  // Picnictafel
  { x: 1066, y: 289,  w: 127,  h: 127  },
];

// Vijver + onderkant: alleen obstakel voor speler, ganzen spawnen hier juist
const POND_OBSTACLES = [
  { x: 0,    y: 983,  w: 1008, h: 217  },
  { x: 1008, y: 1024, w: 424,  h: 176  },
];

// Ganzen spawnen altijd vanuit de vijver of de planten rechts ernaast (linksonder)
const ENEMY_SPAWN_POINTS = [
  // Vijver (x=0–146, y=983–1200)
  { x: 35,  y: 1010 }, { x: 70,  y: 1050 }, { x: 45,  y: 1090 },
  { x: 100, y: 1030 }, { x: 80,  y: 1130 }, { x: 120, y: 1080 },
  // Planten rechts naast vijver (x=150–600, y=990–1150)
  { x: 190, y: 1000 }, { x: 260, y: 1010 }, { x: 340, y: 1005 },
  { x: 420, y: 1000 }, { x: 500, y: 1005 }, { x: 580, y: 1000 },
  { x: 220, y: 1060 }, { x: 310, y: 1060 }, { x: 400, y: 1055 },
  { x: 480, y: 1060 }, { x: 550, y: 1055 },
];

// Speler-spawnpunten op het kronkelpad (afb-coördinaten × 0.6695)
const PLAYER_SPAWN_POINTS = [
  { x: 380, y: 820 },
  { x: 450, y: 720 },
  { x: 490, y: 600 },
  { x: 560, y: 470 },
  { x: 680, y: 360 },
  { x: 820, y: 310 },
];
let enemies     = [];
let projectiles = [];  // { type, x, y, vx, vy, r, dmg, angle, bounces, pierced, slowDur, splashR }
let particles   = [];
let deathEffects = [];  // { x, y, r, maxR, life, maxLife }
let pickups      = [];  // { x, y, type, healAmt }

const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// D-pad: één cirkel-element, richting bepaald door positie t.o.v. middelpunt
const dpad = document.getElementById('dpad');
const DPAD_KEYS = {
  up:    ['ArrowUp',    'w', 'W'],
  down:  ['ArrowDown',  's', 'S'],
  left:  ['ArrowLeft',  'a', 'A'],
  right: ['ArrowRight', 'd', 'D'],
};
const dpadActive = new Set();

function dpadClear() {
  dpadActive.forEach(k => { keys[k] = false; });
  dpadActive.clear();
}

function dpadUpdate(e) {
  const r   = dpad.getBoundingClientRect();
  const dx  = e.clientX - (r.left + r.width  / 2);
  const dy  = e.clientY - (r.top  + r.height / 2);
  dpadClear();
  const dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down'  : 'up');
  DPAD_KEYS[dir].forEach(k => { keys[k] = true; dpadActive.add(k); });
}

dpad.addEventListener('pointerdown',   e => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); dpadUpdate(e); });
dpad.addEventListener('pointermove',   e => { if (e.buttons) dpadUpdate(e); });
dpad.addEventListener('pointerup',     e => { e.preventDefault(); dpadClear(); });
dpad.addEventListener('pointercancel', e => { e.preventDefault(); dpadClear(); });

function startMusic() {
  if (!soundEnabled) return;
  if (MUSIC_TRACKS.main.paused && MUSIC_TRACKS.jazz.paused) {
    MUSIC_TRACKS.main.play();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.random() * (max - min); }

function getNearestEnemy() {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function getFarthestEnemy() {
  let best = null, bestD = -Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d > bestD) { bestD = d; best = e; }
  }
  return best;
}

function wlvl(weaponId) {
  return (player.weapons[weaponId] || 1) - 1; // 0-based index into stat arrays
}

function collidesWithObstacles(x, y, r, checkPond = false) {
  const list = checkPond ? [...obstacles, ...POND_OBSTACLES] : obstacles;
  for (const o of list) {
    const cx = Math.max(o.x, Math.min(o.x + o.w, x));
    const cy = Math.max(o.y, Math.min(o.y + o.h, y));
    if (Math.hypot(cx - x, cy - y) < r) return true;
  }
  return false;
}

function spawnParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(40, 130);
    const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                r: rand(2, 5), life: rand(0.3, 0.7), color };
    p.maxLife = p.life;
    particles.push(p);
  }
}

function spawnOneEnemy(waveNum, type) {
  // Kies een vaste spawnpunt dat ver genoeg van de speler ligt
  const minDist = CONFIG.spawnMinDist;
  const far = ENEMY_SPAWN_POINTS.filter(p =>
    Math.hypot(p.x - player.x, p.y - player.y) >= minDist
  );
  const pool = far.length > 0 ? far : ENEMY_SPAWN_POINTS;
  const sp = pool[Math.floor(Math.random() * pool.length)];
  const x = sp.x + rand(-12, 12);
  const y = sp.y + rand(-12, 12);
  const tier = Math.floor(Math.random() * waveNum);
  const tDef = ENEMY_TYPES[type];
  const hpMult = type === 'bossGoose' ? 3 + waveNum / 5 : tDef.hpMult;
  const baseHp = Math.ceil((CONFIG.enemyBaseHp + tier * 2) * hpMult);
  const extra = type === 'bossGoose' ? { shootTimer: 3.0, telegraphTimer: 0 } : {};
  if (enemies.length >= CONFIG.maxEnemies) return;  // safety cap
  enemies.push({ x, y,
    r: Math.min((11 + tier * 1.5) * tDef.sizeMult, CONFIG.maxEnemyRadius),
    hp: baseHp, maxHp: baseHp,
    speed: (CONFIG.enemyBaseSpeed + Math.sqrt(tier) * 25 + rand(0, 20)) * tDef.speedMult,
    tier, type,
    slowTimer: 0, hitTimer: 0, kbx: 0, kby: 0,
    ...extra,
  });
}

function spawnEnemiesForWave(waveNum) {
  const isBossWave = waveNum % 5 === 0;
  graceTimer = isBossWave ? 1.5 : 1.0;

  if (isBossWave) {
    const bossCount = waveNum / 5;
    for (let b = 0; b < bossCount; b++)
      spawnOneEnemy(waveNum, 'bossGoose');
    playSound(sfxBaasgans);
    waveMessage = { text: 'ALARM: ALPHA-MALE!', timer: 1.5 };
    const extraCount = Math.max(1, Math.floor(waveNum * 0.4));
    for (let i = 0; i < extraCount; i++) {
      const typePool = ['normal', ...(waveNum >= 2 ? ['tank'] : [])];
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      spawnOneEnemy(waveNum, type);
    }
  } else {
    for (let i = 0; i < waveNum + 2; i++) {
      const typePool = ['normal', ...(waveNum >= 2 ? ['tank'] : []), ...(waveNum >= 3 ? ['flyer'] : [])];
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      spawnOneEnemy(waveNum, type);
    }
  }
}

// ─── Upgrade pool ─────────────────────────────────────────────────────────────
function buildUpgradePool() {
  const pool = [];
  for (const [id, def] of Object.entries(WEAPON_DEFS)) {
    const current = player.weapons[id] || 0;
    if (current === 0) {
      pool.push({ weaponId: id, newLevel: 1,
        name: def.label,
        desc: upgradeDesc(id, 1) });
    } else if (current < def.maxLevel) {
      pool.push({ weaponId: id, newLevel: current + 1,
        name: `${def.label} level ${current + 1}`,
        desc: upgradeDesc(id, current + 1) });
    }
  }
  // Stat upgrades
  pool.push({ weaponId: null, name: 'Max HP +15',     desc: 'Meer uithoudingsvermogen.',
    apply: () => { player.maxHp += CONFIG.hpUpgrade; player.hp = Math.min(player.hp + CONFIG.hpUpgrade, player.maxHp); } });
  pool.push({ weaponId: null, name: 'Snellere benen', desc: 'Loop 10% sneller.',
    apply: () => { player.speed *= CONFIG.speedUpgrade; } });
  pool.push({ weaponId: null, name: 'EHBO-kit',       desc: 'Herstel 40 HP.',
    apply: () => { player.hp = Math.min(player.hp + CONFIG.healUpgrade, player.maxHp); } });
  return pool;
}

function upgradeDesc(id, level) {
  const i = level - 1;
  const d = WEAPON_DEFS[id];
  switch (id) {
    case 'paraplu':  return `Schade ${d.dmg[i]}, bereik ${d.reach[i]}px${d.double[i] ? ', dubbele zwaai!' : ''}`;
    case 'boek':     return `Schade ${d.dmg[i]}, ${d.rate[i].toFixed(1)}/s${d.piercing[i] ? ', doorboorend' : ''}`;
    case 'passer':   return `Schade ${d.dmg[i]}, elke ${d.interval[i]}s rondzwaai`;
    case 'gum':      return `Schade ${d.dmg[i]}, ${d.rate[i].toFixed(1)}/s${d.bounces[i] > 0 ? `, ${d.bounces[i]}x bounce` : ''}`;
    case 'thermos':  return `Schade ${d.dmg[i]}, vertraagt ${d.slow[i]}s${d.splash[i] ? ', splash!' : ''}`;
    case 'liniaal':  return `Schade ${d.dmg[i]}, lengte ${d.length[i]}px`;
    case 'rugzak':   return `Schade ${d.dmg[i]}, splashstraal ${d.splashR[i]}px`;
    default: return '';
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetGame() {
  // Kies een spawnpunt dat aantoonbaar vrij is van obstakels
  const shuffled = [...PLAYER_SPAWN_POINTS].sort(() => Math.random() - 0.5);
  let sp = shuffled[0];
  for (const candidate of shuffled) {
    if (!collidesWithObstacles(candidate.x, candidate.y, CONFIG.playerRadius, true)) {
      sp = candidate; break;
    }
  }
  Object.assign(player, {
    x: sp.x, y: sp.y,
    hp: CONFIG.playerHp, maxHp: CONFIG.playerHp,
    speed: CONFIG.playerSpeed,
    facingAngle: 0, invincible: 0,
    weapons: { [Object.keys(WEAPON_DEFS)[Math.floor(Math.random() * Object.keys(WEAPON_DEFS).length)]]: 1 },
    cooldowns: {},
    swing: null, spinSwing: null, liniaalFlash: null,
  });
  enemies = []; projectiles = []; particles = []; pickups = [];
  wave = 1; wavePhase = 'fighting'; waveMessage = null; betweenWavesTimer = 0; elapsed = 0; graceTimer = 0;
}

// ─── Kill helper ──────────────────────────────────────────────────────────────
function killEnemy(i) {
  playSfx('gans');
  const { x, y, r, type } = enemies[i];
  spawnParticles(x, y, '#e0e0e0', 10);
  deathEffects.push({ x, y, r: r * 0.5, maxR: r * 2.5, life: 0.35, maxLife: 0.35 });
  if (type === 'bossGoose')
    pickups.push({ x, y, type: 'heart', healAmt: Math.round(player.maxHp * 0.1) });
  enemies.splice(i, 1);
  if (enemies.length === 0 && wavePhase === 'fighting') {
    // Ruim overblijvende boss-projectielen op zodra de wave gewonnen is
    for (let k = projectiles.length - 1; k >= 0; k--) {
      if (projectiles[k].fromBoss) projectiles.splice(k, 1);
    }
    wavePhase = 'betweenWaves';
    betweenWavesTimer = CONFIG.waveBreakDuration;
    waveMessage = { text: `Ronde ${wave} voltooid!`, timer: CONFIG.waveBreakDuration };
  }
}

function damageEnemy(i, dmg) {
  const e = enemies[i];
  e.hp -= dmg;
  spawnParticles(e.x, e.y, '#fff', 3);
  e.hitTimer = 0.12;
  const kbAngle = Math.atan2(e.y - player.y, e.x - player.x);
  e.kbx = Math.cos(kbAngle) * 80;
  e.kby = Math.sin(kbAngle) * 80;
  if (e.hp <= 0) { killEnemy(i); return true; }
  return false;
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  if (wavePhase === 'choosingUpgrade') return;
  if (wavePhase === 'betweenWaves') {
    betweenWavesTimer -= dt;
    if (betweenWavesTimer <= 0) {
      wavePhase = 'choosingUpgrade';
      showLevelUp();
    }
    return;
  }
  if (wavePhase === 'startingWave') {
    betweenWavesTimer -= dt;
    if (betweenWavesTimer <= 0) {
      wavePhase = 'fighting';
      spawnEnemiesForWave(wave);
    }
    return;
  }
  elapsed += dt;

  if (waveMessage) { waveMessage.timer -= dt; if (waveMessage.timer <= 0) waveMessage = null; }
  if (graceTimer > 0) graceTimer = Math.max(0, graceTimer - dt);

  // Movement
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
  if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
  if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  const nx = Math.max(player.r, Math.min(CONFIG.mapWidth  - player.r, player.x + dx * player.speed * dt));
  const ny = Math.max(player.r, Math.min(CONFIG.mapHeight - player.r, player.y + dy * player.speed * dt));
  if (!collidesWithObstacles(nx, player.y, player.r, true)) player.x = nx;
  if (!collidesWithObstacles(player.x, ny, player.r, true)) player.y = ny;
  player.vx = dx * player.speed;
  player.vy = dy * player.speed;

  const nearest  = getNearestEnemy();
  const farthest = getFarthestEnemy();
  if (nearest) player.facingAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
  else if (dx || dy) player.facingAngle = Math.atan2(dy, dx);

  const cd = player.cooldowns;

  // ── Paraplu ──
  if (player.weapons.paraplu) {
    const pLvl = wlvl('paraplu');
    const pDef = WEAPON_DEFS.paraplu;
    if (player.swing) {
      player.swing.progress += dt / player.swing.duration;
      if (player.swing.progress >= 1) player.swing = null;
    }
    cd.paraplu = (cd.paraplu || 0) - dt;
    if (cd.paraplu <= 0 && !player.swing && nearest) {
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      player.swing = { angle, progress: 0, duration: 0.4, hitSet: new Set() };
      playSfx('paraplu');
      if (pDef.double[pLvl]) {
        player.swing.double = true;
      }
      cd.paraplu = jitter(1 / pDef.rate[pLvl]);
    }
  }

  // ── Passer ──
  if (player.weapons.passer) {
    const passLvl = wlvl('passer');
    const passDef = WEAPON_DEFS.passer;
    if (player.spinSwing) {
      player.spinSwing.progress += dt / player.spinSwing.duration;
      if (player.spinSwing.progress >= 1) player.spinSwing = null;
    }
    cd.passer = (cd.passer || 0) - dt;
    if (cd.passer <= 0 && !player.spinSwing) {
      playSfx('passer');
      player.spinSwing = { progress: 0, duration: 0.5, hitSet: new Set(),
        reach: passDef.reach[passLvl], dmg: passDef.dmg[passLvl] };
      cd.passer = jitter(passDef.interval[passLvl]);
    }
  }

  // ── Liniaal ──
  if (player.weapons.liniaal) {
    const linLvl = wlvl('liniaal');
    const linDef = WEAPON_DEFS.liniaal;
    if (player.liniaalFlash) {
      player.liniaalFlash.progress += dt / 0.25;
      if (player.liniaalFlash.progress >= 1) player.liniaalFlash = null;
    }
    cd.liniaal = (cd.liniaal || 0) - dt;
    if (cd.liniaal <= 0 && !player.liniaalFlash && nearest) {
      playSfx('liniaal');
      player.liniaalFlash = { angle: player.facingAngle, progress: 0,
        length: linDef.length[linLvl], width: linDef.width[linLvl],
        dmg: linDef.dmg[linLvl], hitSet: new Set() };
      cd.liniaal = jitter(1 / linDef.rate[linLvl]);
    }
  }

  // ── Boek ──
  if (player.weapons.boek) {
    const bLvl = wlvl('boek');
    const bDef = WEAPON_DEFS.boek;
    cd.boek = (cd.boek || 0) - dt;
    if (cd.boek <= 0 && farthest) {
      playSfx('boek');
      const angle = Math.atan2(farthest.y - player.y, farthest.x - player.x);
      projectiles.push({ type: 'boek', x: player.x, y: player.y,
        vx: Math.cos(angle) * bDef.speed[bLvl], vy: Math.sin(angle) * bDef.speed[bLvl],
        angle: 0, r: 7, dmg: bDef.dmg[bLvl], piercing: bDef.piercing[bLvl], pierced: new Set() });
      cd.boek = jitter(1 / bDef.rate[bLvl]);
    }
  }

  // ── Gum ──
  if (player.weapons.gum) {
    const gLvl = wlvl('gum');
    const gDef = WEAPON_DEFS.gum;
    cd.gum = (cd.gum || 0) - dt;
    if (cd.gum <= 0 && nearest) {
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      playSfx('gum');
      projectiles.push({ type: 'gum', x: player.x, y: player.y,
        vx: Math.cos(angle) * gDef.speed[gLvl], vy: Math.sin(angle) * gDef.speed[gLvl],
        r: 5, dmg: gDef.dmg[gLvl], bouncesLeft: gDef.bounces[gLvl] });
      cd.gum = jitter(1 / gDef.rate[gLvl]);
    }
  }

  // ── Thermos ──
  if (player.weapons.thermos) {
    const tLvl = wlvl('thermos');
    const tDef = WEAPON_DEFS.thermos;
    cd.thermos = (cd.thermos || 0) - dt;
    if (cd.thermos <= 0 && nearest) {
      playSfx('thermos');
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      projectiles.push({ type: 'thermos', x: player.x, y: player.y,
        vx: Math.cos(angle) * CONFIG.thermosSpeed, vy: Math.sin(angle) * CONFIG.thermosSpeed,
        r: 8, dmg: tDef.dmg[tLvl], slowDur: tDef.slow[tLvl],
        splash: tDef.splash[tLvl], splashR: tDef.splashR[tLvl] });
      cd.thermos = jitter(1 / tDef.rate[tLvl]);
    }
  }

  // ── Rugzak ──
  if (player.weapons.rugzak) {
    const rLvl = wlvl('rugzak');
    const rDef = WEAPON_DEFS.rugzak;
    cd.rugzak = (cd.rugzak || 0) - dt;
    if (cd.rugzak <= 0 && nearest) {
      playSfx('rugzak');
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      projectiles.push({ type: 'rugzak', x: player.x, y: player.y,
        vx: Math.cos(angle) * rDef.speed[rLvl], vy: Math.sin(angle) * rDef.speed[rLvl],
        r: 14, dmg: rDef.dmg[rLvl], splashR: rDef.splashR[rLvl] });
      cd.rugzak = jitter(1 / rDef.rate[rLvl]);
    }
  }

  // ── Move projectiles ──
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'boek') p.angle += dt * 6;
    if (p.x < -40 || p.x > CONFIG.mapWidth + 40 || p.y < -40 || p.y > CONFIG.mapHeight + 40
        || collidesWithObstacles(p.x, p.y, p.r))
      projectiles.splice(i, 1);
  }

  // ── Enemies ──
  if (player.invincible > 0) player.invincible -= dt;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e) continue;  // guard: splice in geneste loop kan index verschuiven
    if (e.slowTimer > 0) e.slowTimer -= dt;
    if (e.hitTimer > 0) e.hitTimer -= dt;
    if (e.kbx !== 0 || e.kby !== 0) {
      e.x += e.kbx * dt;
      e.y += e.kby * dt;
      e.kbx *= Math.max(0, 1 - dt * 12);
      e.kby *= Math.max(0, 1 - dt * 12);
      if (Math.hypot(e.kbx, e.kby) < 1) { e.kbx = 0; e.kby = 0; }
    }
    // Boss: schiet periodiek op de speler (geluid als telegraph, projectile 0.25s later)
    if (e.type === 'bossGoose') {
      e.shootTimer -= dt;
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        if (e.telegraphTimer <= 0) {
          const bossProj = projectiles.filter(p => p.fromBoss).length;
          if (bossProj < CONFIG.maxBossProj) {
            const bA = Math.atan2(player.y - e.y, player.x - e.x);
            projectiles.push({ type: 'baasgans', fromBoss: true,
              x: e.x, y: e.y, r: 14,
              vx: Math.cos(bA) * 180, vy: Math.sin(bA) * 180,
              dmg: CONFIG.contactDamage * 1.5 });
          }
        }
      }
      if (e.shootTimer <= 0) {
        e.shootTimer = rand(2.5, 4.0);
        e.telegraphTimer = 0.25;   // geluid nu, projectile over 0.25s
        playSound(sfxGanspoep);
      }
    }

    const graceMult = graceTimer > 0 ? 0.25 + 0.75 * (1 - graceTimer) : 1;
    const spd = (e.slowTimer > 0 ? e.speed * CONFIG.enemySlowFactor : e.speed) * graceMult;
    // Bosses mikken op een punt iets vóór de speler (intercept), overige vijanden direct op de speler
    let targetX = player.x, targetY = player.y;
    if (e.type === 'bossGoose' && (player.vx !== 0 || player.vy !== 0)) {
      const leadT = 0.55;  // seconden vooruit kijken
      targetX += player.vx * leadT;
      targetY += player.vy * leadT;
    }
    const toA = Math.atan2(targetY - e.y, targetX - e.x);
    let mx = Math.cos(toA) * spd;
    let my = Math.sin(toA) * spd;

    // Separation: duw weg van te dichtbij staande ganzen
    for (let j = 0; j < enemies.length; j++) {
      if (j === i) continue;
      const ox = e.x - enemies[j].x;
      const oy = e.y - enemies[j].y;
      const dist = Math.hypot(ox, oy);
      const minDist = e.r + enemies[j].r + CONFIG.separationDist;
      if (dist < minDist && dist > 0) {
        const f = CONFIG.separationStr / dist;
        mx += ox * f;
        my += oy * f;
      }
    }

    const ex = Math.max(e.r, Math.min(CONFIG.mapWidth  - e.r, e.x + mx * dt));
    const ey = Math.max(e.r, Math.min(CONFIG.mapHeight - e.r, e.y + my * dt));
    if (ENEMY_TYPES[e.type]?.ignoresObstacles) {
      e.x = ex; e.y = ey;
    } else {
      const canX = !collidesWithObstacles(ex, e.y, e.r);
      const canY = !collidesWithObstacles(e.x, ey, e.r);
      if (canX) e.x = ex;
      if (canY) e.y = ey;

      // Vastgelopen: probeer loodrechte richting om los te komen
      if (!canX && !canY) {
        for (const side of [toA + Math.PI / 2, toA - Math.PI / 2]) {
          const px = Math.max(e.r, Math.min(CONFIG.mapWidth  - e.r, e.x + Math.cos(side) * spd * dt));
          const py = Math.max(e.r, Math.min(CONFIG.mapHeight - e.r, e.y + Math.sin(side) * spd * dt));
          if (!collidesWithObstacles(px, e.y, e.r)) { e.x = px; break; }
          if (!collidesWithObstacles(e.x, py, e.r)) { e.y = py; break; }
        }
      }
    }

    // Hits player
    if (player.invincible <= 0 && Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
      player.hp -= CONFIG.contactDamage; player.invincible = CONFIG.playerIframes;
      playSound(sfxAuw);
      spawnParticles(player.x, player.y, '#e74c3c', 8);
      if (player.hp <= 0) { player.hp = 0; endGame(); return; }
    }

    let killed = false;

    // Paraplu
    if (player.swing && !player.swing.hitSet.has(i)) {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < pDef.reach[pLvl] + e.r) {
        let diff = Math.atan2(e.y - player.y, e.x - player.x) - player.swing.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < pDef.arc[pLvl] / 2) {
          player.swing.hitSet.add(i);
          killed = damageEnemy(i, pDef.dmg[pLvl]);
          if (!killed) {
            const kbA = Math.atan2(e.y - player.y, e.x - player.x);
            e.kbx = Math.cos(kbA) * 200; e.kby = Math.sin(kbA) * 200;
          }
        }
      }
    }
    if (killed) continue;

    // Passer (spin)
    if (player.spinSwing && !player.spinSwing.hitSet.has(i)) {
      if (Math.hypot(e.x - player.x, e.y - player.y) < player.spinSwing.reach + e.r) {
        player.spinSwing.hitSet.add(i);
        const critMult = e.hp < e.maxHp / 2 ? 2 : 1;
        killed = damageEnemy(i, player.spinSwing.dmg * critMult);
      }
    }
    if (killed) continue;

    // Liniaal
    if (player.liniaalFlash && !player.liniaalFlash.hitSet.has(i)) {
      const lf = player.liniaalFlash;
      // Project enemy onto the beam
      const ex = e.x - player.x, ey = e.y - player.y;
      const cos = Math.cos(lf.angle), sin = Math.sin(lf.angle);
      const along = ex * cos + ey * sin;
      const perp  = Math.abs(-ex * sin + ey * cos);
      if (along > 0 && along < lf.length && perp < lf.width / 2 + e.r) {
        lf.hitSet.add(i);
        killed = damageEnemy(i, lf.dmg);
      }
    }
    if (killed) continue;

    // Boss-projectielen raken de speler (niet de vijanden)
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const p = projectiles[j];
      if (!p.fromBoss) continue;
      if (player.invincible > 0) continue;
      if (Math.hypot(p.x - player.x, p.y - player.y) > p.r + player.r) continue;
      player.hp -= p.dmg; player.invincible = CONFIG.playerIframes;
      playSound(sfxAuw);
      spawnParticles(player.x, player.y, '#8B0000', 8);
      projectiles.splice(j, 1);
      if (player.hp <= 0) { player.hp = 0; endGame(); return; }
    }

    // Speler-projectielen raken vijanden
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const p = projectiles[j];
      if (p.fromBoss) continue;
      if (Math.hypot(p.x - e.x, p.y - e.y) > p.r + e.r) continue;

      if (p.type === 'gum') {
        spawnParticles(e.x, e.y, '#f39c12', 3);
        killed = damageEnemy(i, p.dmg);
        if (p.bouncesLeft > 0) {
          // Bounce: redirect to next nearest enemy
          p.bouncesLeft--;
          const next = enemies.filter((_, idx) => idx !== i)
            .sort((a, b) => Math.hypot(a.x-p.x,a.y-p.y) - Math.hypot(b.x-p.x,b.y-p.y))[0];
          if (next) {
            const spd2 = Math.hypot(p.vx, p.vy);
            const na = Math.atan2(next.y - p.y, next.x - p.x);
            p.vx = Math.cos(na) * spd2; p.vy = Math.sin(na) * spd2;
          } else {
            projectiles.splice(j, 1);
          }
        } else {
          projectiles.splice(j, 1);
        }
        if (killed) break; else continue;
      }

      if (p.type === 'thermos') {
        e.slowTimer = p.slowDur;
        if (p.splash) {
          // Splash: damage + slow overige vijanden (sla i over – die krijgt aparte full damage)
          for (let k = enemies.length - 1; k >= 0; k--) {
            if (k === i) continue;
            if (Math.hypot(enemies[k].x - p.x, enemies[k].y - p.y) < p.splashR) {
              enemies[k].slowTimer = p.slowDur;
              damageEnemy(k, Math.ceil(p.dmg / 2));
            }
          }
          spawnParticles(p.x, p.y, '#3498db', 12);
        }
        projectiles.splice(j, 1);
        // Hercheck: i kan verschoven zijn als splash vijanden onder i heeft gedood
        if (i < enemies.length) {
          killed = damageEnemy(i, p.dmg);
        } else {
          killed = true;
        }
        if (killed) break; else continue;
      }

      if (p.type === 'rugzak') {
        // Splash damage alle vijanden in straal (sla i over – aparte check erna)
        for (let k = enemies.length - 1; k >= 0; k--) {
          if (k === i) continue;
          if (Math.hypot(enemies[k].x - p.x, enemies[k].y - p.y) < p.splashR) {
            damageEnemy(k, p.dmg);
          }
        }
        // Schade aan de direct geraakte vijand (hercheck index na splices)
        if (i < enemies.length && Math.hypot(enemies[i].x - p.x, enemies[i].y - p.y) < p.splashR) {
          damageEnemy(i, p.dmg);
        }
        spawnParticles(p.x, p.y, '#8B4513', 14);
        projectiles.splice(j, 1);
        killed = true; break;
      }

      // boek (with optional piercing)
      if (p.type === 'boek') {
        if (p.pierced && p.pierced.has(i)) continue;
        if (p.pierced) p.pierced.add(i); else projectiles.splice(j, 1);
        spawnParticles(e.x, e.y, '#8B2500', 4);
        killed = damageEnemy(i, p.dmg);
        if (killed) break;
      }
    }

    if (killed) continue;
  }

  // ── Death effects ──
  for (let i = deathEffects.length - 1; i >= 0; i--) {
    const d = deathEffects[i];
    d.r += (d.maxR - d.r) * dt * 8;
    d.life -= dt;
    if (d.life <= 0) deathEffects.splice(i, 1);
  }

  // ── Particles ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.9; p.vy *= 0.9;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ── Pickups (hartjes bewegen naar speler) ──
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    const dx = player.x - pk.x;
    const dy = player.y - pk.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) { pk.x += (dx / dist) * 120 * dt; pk.y += (dy / dist) * 120 * dt; }
    if (dist < player.r + 10) {
      player.hp = Math.min(player.maxHp, player.hp + pk.healAmt);
      spawnParticles(pk.x, pk.y, '#e74c3c', 8);
      pickups.splice(i, 1);
    }
  }
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawGoose(e) {
  const { x, y, r, hp, maxHp, tier, slowTimer, hitTimer, type } = e;
  const angle = Math.atan2(player.y - e.y, player.x - e.x);
  const tDef  = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
  const baseColor = tDef.color || (tier < 2 ? '#f5f5f5' : tier < 4 ? '#f0e8d0' : '#e8d0b0');
  const bodyColor = (hitTimer > 0) ? '#ffffff' : baseColor;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (slowTimer > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.8; ctx.stroke();

  ctx.fillStyle = '#dcdcdc';
  ctx.beginPath(); ctx.ellipse(0, -r*0.48, r*0.55, r*0.17, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,  r*0.48, r*0.55, r*0.17,-0.2, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(r*0.72, 0, r*0.28, r*0.2, 0, 0, Math.PI*2); ctx.fill();

  const hx = r * 1.02;
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.arc(hx, 0, r*0.27, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5; ctx.stroke();

  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.moveTo(hx+r*0.27, -r*0.09); ctx.lineTo(hx+r*0.52, 0); ctx.lineTo(hx+r*0.27, r*0.09);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(hx+r*0.08, -r*0.09, r*0.065, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(hx+r*0.1, -r*0.11, r*0.025, 0, Math.PI*2); ctx.fill();

  ctx.restore();

  const bw = r*2.5, bh = 4;
  ctx.fillStyle = '#333'; ctx.fillRect(x-bw/2, y-r-10, bw, bh);
  ctx.fillStyle = '#2ecc71'; ctx.fillRect(x-bw/2, y-r-10, bw*(hp/maxHp), bh);
}

function drawStudent() {
  const { x, y, r, facingAngle, invincible } = player;
  if (invincible > 0 && Math.floor(invincible * 10) % 2 === 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facingAngle);

  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(-r*0.95, -r*0.55, r*0.7, r*1.1);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-r*0.82, -r*0.38, r*0.45, r*0.62);
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 0.8;
  ctx.strokeRect(-r*0.82, -r*0.38, r*0.45, r*0.62);

  ctx.fillStyle = '#1a3a6c';
  ctx.beginPath(); ctx.ellipse(0, 0, r*0.72, r*0.9, 0, 0, Math.PI*2); ctx.fill();

  const hx = r * 0.68;
  ctx.fillStyle = '#f5cba7';
  ctx.beginPath(); ctx.arc(hx, 0, r*0.44, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(hx, 0, r*0.46, Math.PI, 0); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#922b21';
  ctx.fillRect(hx+r*0.05, -r*0.09, r*0.52, r*0.18);

  ctx.restore();

  const pw = 60, ph = 6;
  ctx.fillStyle = '#333'; ctx.fillRect(x-pw/2, y-r-12, pw, ph);
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(x-pw/2, y-r-12, pw*(player.hp/player.maxHp), ph);
}

function drawParasol() {
  if (!player.swing) return;
  const { x, y, swing } = player;
  const pLvl = wlvl('paraplu');
  const reach = WEAPON_DEFS.paraplu.reach[pLvl];
  const arc   = WEAPON_DEFS.paraplu.arc[pLvl];
  const { angle, progress } = swing;
  const half = arc / 2;

  ctx.globalAlpha = 0.2 * (1 - progress);
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.arc(x, y, reach, angle - half, angle + half);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  const cur  = angle - half + arc * progress;
  const tipX = x + Math.cos(cur) * reach;
  const tipY = y + Math.sin(cur) * reach;

  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tipX, tipY); ctx.stroke();

  ctx.save();
  ctx.translate(tipX, tipY); ctx.rotate(cur);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.arc(0, 0, 11, -Math.PI/2, Math.PI/2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
  for (let k = -2; k <= 2; k++) {
    const sy = k * 4.5, sx = Math.sqrt(Math.max(0, 121 - sy*sy));
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(sx, sy); ctx.stroke();
  }
  ctx.strokeStyle = '#7b241c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 11, -Math.PI/2, Math.PI/2); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

function drawPasser() {
  if (!player.spinSwing) return;
  const { x, y } = player;
  const { progress, reach } = player.spinSwing;
  ctx.globalAlpha = 0.35 * (1 - progress);
  ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 10 * (1 - progress);
  ctx.beginPath(); ctx.arc(x, y, reach, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLiniaal() {
  if (!player.liniaalFlash) return;
  const { x, y, liniaalFlash: lf } = player;
  const alpha = 1 - lf.progress;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.rotate(lf.angle);
  ctx.fillStyle = '#f0e68c';
  ctx.fillRect(0, -lf.width / 2, lf.length, lf.width);
  ctx.strokeStyle = '#daa520'; ctx.lineWidth = 1;
  ctx.strokeRect(0, -lf.width / 2, lf.length, lf.width);
  // Ruler marks
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8;
  for (let m = 10; m < lf.length; m += 10) {
    const h = m % 50 === 0 ? lf.width * 0.6 : lf.width * 0.3;
    ctx.beginPath(); ctx.moveTo(m, -h/2); ctx.lineTo(m, h/2); ctx.stroke();
  }
  ctx.restore();
}

function drawProjectiles() {
  for (const p of projectiles) {
    if (p.type === 'boek') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = '#8B2500'; ctx.fillRect(-7, -5, 14, 10);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-6, -4, 12, 8);
      ctx.restore();
    } else if (p.type === 'gum') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(p.x - 4, p.y - 3, 8, 6);
    } else if (p.type === 'thermos') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#2980b9';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3498db';
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    } else if (p.type === 'rugzak') {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-p.r * 0.7, -p.r * 0.5, p.r * 1.2, p.r * 0.9);
      ctx.restore();
    } else if (p.type === 'baasgans') {
      // Donkerrode stinkende gansbal
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#6B0000';
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF4444';
      ctx.beginPath(); ctx.arc(-3, -3, p.r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ─── Background ──────────────────────────────────────────────────────────────
function drawBackground() {
  if (mapImage.complete && mapImage.naturalWidth > 0) {
    ctx.drawImage(mapImage, 0, 0, CONFIG.mapWidth, CONFIG.mapHeight);
    // Dek het Gemini-watermerk rechtsonder af met gebouwkleur
    ctx.fillStyle = '#b05820';
    ctx.fillRect(1510, 1148, 90, 52);
    return;
  }
  // Fallback zolang afbeelding nog laadt
  ctx.fillStyle = '#52b03a';
  ctx.fillRect(0, 0, CONFIG.mapWidth, CONFIG.mapHeight);
}

function drawBackgroundOLD_UNUSED() {
  const MW = CONFIG.mapWidth, MH = CONFIG.mapHeight;

  // Gras (egaal groen met subtiele horizontale gazonstrepering)
  ctx.fillStyle = '#52b03a';
  ctx.fillRect(0, 0, MW, MH);
  ctx.fillStyle = 'rgba(0,0,0,0.025)';
  for (let gy = 0; gy < MH; gy += 40)
    ctx.fillRect(0, gy, MW, 20);

  // Schaduwen van gebouwen op gras (getekend vroeg, vóór alles)
  let sh;
  sh = ctx.createLinearGradient(135, 0, 175, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.32)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(135, 65, 40, 935);

  sh = ctx.createLinearGradient(0, 65, 0, 105);
  sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(175, 65, 1365, 40);

  sh = ctx.createLinearGradient(1540, 0, 1500, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.26)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(1500, 65, 40, 1035);

  sh = ctx.createLinearGradient(0, 1056, 0, 1016);
  sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(220, 1016, 1320, 40);

  // Kronkelpad — vloeiende S-bocht met C1-continuïteit bij elke knik
  // Punten zijn berekend zodat de tangentvectoren doorlopen (geen hoeken)
  function tracePad() {
    ctx.beginPath();
    ctx.moveTo(135, 750);
    ctx.bezierCurveTo(178, 832, 268, 946, 382, 988);
    ctx.bezierCurveTo(496, 1030, 550, 1010, 584, 958);
    ctx.bezierCurveTo(618, 906, 668, 826, 756, 756);
    ctx.bezierCurveTo(844, 686, 940, 630, 1060, 576);
    ctx.bezierCurveTo(1180, 522, 1360, 480, 1540, 462);
  }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 90; ctx.strokeStyle = '#A89060'; tracePad(); ctx.stroke();
  ctx.lineWidth = 78; ctx.strokeStyle = '#D4C4A8'; tracePad(); ctx.stroke();
  // Subtiele middenlijn
  ctx.restore();

  // Bomen (vóór gebouw getekend zodat gebouw erover staat)
  function drawTree(tx, ty) {
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(tx - 5, ty, 10, 30);
    ctx.fillStyle = '#145A32';
    ctx.beginPath(); ctx.arc(tx, ty, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1E8449';
    ctx.beginPath(); ctx.arc(tx - 8, ty - 9, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.arc(tx + 7, ty - 11, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath(); ctx.arc(tx - 1, ty - 16, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#58D68D';
    ctx.beginPath(); ctx.arc(tx + 2, ty - 19, 7, 0, Math.PI * 2); ctx.fill();
  }
  drawTree(950, 720); drawTree(1340, 620); drawTree(680, 280);
  drawTree(1200, 800); drawTree(820, 900);

  // Gebouw (links, oranje baksteen)
  ctx.fillStyle = '#E67E22';
  ctx.fillRect(0, 0, 135, 920);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 135, 920); ctx.clip();
  for (let row = 0; row < 920; row += 18) {
    const off = ((row / 18 | 0) % 2) * 22;
    ctx.fillStyle = '#C0522B';
    for (let col = off - 44; col < 135; col += 44)
      ctx.fillRect(col + 2, row + 2, 40, 13);
  }
  ctx.restore();
  for (let wy = 72; wy < 820; wy += 100) {
    ctx.fillStyle = '#FDFEFE'; ctx.fillRect(10, wy, 112, 72);
    ctx.fillStyle = '#5DADE2'; ctx.fillRect(14, wy + 4, 104, 64);
    ctx.strokeStyle = '#FDFEFE'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(66, wy + 4); ctx.lineTo(66, wy + 68); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, wy + 36); ctx.lineTo(118, wy + 36); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(16, wy + 6, 34, 18);
  }
  // Entree deur
  ctx.fillStyle = '#FDFEFE'; ctx.fillRect(8, 832, 119, 88);
  ctx.fillStyle = '#AED6F1'; ctx.fillRect(12, 836, 111, 84);
  ctx.strokeStyle = '#FDFEFE'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(67, 836); ctx.lineTo(67, 920); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(14, 838, 38, 22);
  ctx.fillStyle = '#F1C40F'; ctx.fillRect(72, 880, 12, 3); // deurhendel
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(128, 0, 7, 920); // schaduw

  // Vijver (linksonder) — gradient schaduw voor zachte inbedding in gras
  sh = ctx.createRadialGradient(95, 1058, 108, 95, 1058, 148);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.ellipse(95, 1058, 148, 158, 0, 0, Math.PI * 2); ctx.fill();
  // Stenen rand
  ctx.fillStyle = '#8D9EA0';
  ctx.beginPath(); ctx.ellipse(95, 1058, 124, 138, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#95A5A6';
  ctx.beginPath(); ctx.ellipse(95, 1058, 120, 134, 0, 0, Math.PI * 2); ctx.fill();
  // Water
  const pg = ctx.createRadialGradient(82, 1040, 10, 95, 1058, 115);
  pg.addColorStop(0, '#7EC8E3'); pg.addColorStop(0.55, '#2196F3'); pg.addColorStop(1, '#0D47A1');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(95, 1058, 113, 127, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath(); ctx.ellipse(95, 1058, 20 * i, 18 * i, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#27AE60'; ctx.beginPath(); ctx.ellipse(72, 1038, 13, 9, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E8A0A8'; ctx.beginPath(); ctx.arc(72, 1035, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F8E799'; ctx.beginPath(); ctx.arc(72, 1035, 2.5, 0, Math.PI * 2); ctx.fill();

  // Bovenmuur (oranje baksteen + ramen)
  ctx.fillStyle = '#E67E22';
  ctx.fillRect(135, 0, 1465, 65);
  ctx.save();
  ctx.beginPath(); ctx.rect(135, 0, 1465, 65); ctx.clip();
  for (let col = 135; col < 1600; col += 50) {
    const off = ((col - 135) / 50 | 0) % 2 === 0 ? 0 : 25;
    ctx.fillStyle = '#C0522B';
    ctx.fillRect(col + 2, 2, 46, 26);
    ctx.fillRect(col + 2 + off, 30, 46, 30);
  }
  ctx.restore();
  for (let wx = 185; wx < 1520; wx += 115) {
    ctx.fillStyle = '#FDFEFE'; ctx.fillRect(wx, 4, 88, 57);
    ctx.fillStyle = '#5DADE2'; ctx.fillRect(wx + 4, 8, 80, 49);
    ctx.strokeStyle = '#FDFEFE'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx + 44, 8); ctx.lineTo(wx + 44, 57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + 4, 32); ctx.lineTo(wx + 84, 32); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.26)'; ctx.fillRect(wx + 6, 10, 28, 14);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(135, 61, 1465, 6);

  // Rechterrand (heg)
  ctx.fillStyle = '#145A32'; ctx.fillRect(1540, 65, 60, 1035);
  ctx.fillStyle = '#196F3D';
  for (let hy = 78; hy < 1100; hy += 30) {
    ctx.beginPath(); ctx.arc(1552, hy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1572, hy + 15, 16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1E8449';
  for (let hy = 81; hy < 1100; hy += 30) {
    ctx.beginPath(); ctx.arc(1554, hy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1574, hy + 15, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#27AE60';
  for (let hy = 83; hy < 1100; hy += 30) {
    ctx.beginPath(); ctx.arc(1555, hy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1575, hy + 15, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Weg (onderaan)
  ctx.fillStyle = '#626567'; ctx.fillRect(135, 1100, 1465, 100);
  ctx.fillStyle = '#AAB2B9'; ctx.fillRect(135, 1100, 1465, 7);
  ctx.fillStyle = '#F0F3F4';
  for (let wx = 180; wx < 1600; wx += 60) ctx.fillRect(wx, 1148, 36, 5);

  // Auto's (op weg)
  const cars = [
    { x: 1048, y: 1108, color: '#E74C3C', dark: '#C0392B' },
    { x: 1198, y: 1108, color: '#3498DB', dark: '#2980B9' },
    { x: 1378, y: 1108, color: '#2ECC71', dark: '#1E8449' },
  ];
  for (const car of cars) {
    const { x: ax, y: ay, color, dark } = car;
    ctx.fillStyle = dark;  ctx.fillRect(ax, ay, 90, 36);
    ctx.fillStyle = color; ctx.fillRect(ax + 2, ay + 2, 86, 24);
    ctx.fillStyle = '#AED6F1';
    ctx.fillRect(ax + 8,  ay + 4, 28, 16);
    ctx.fillRect(ax + 54, ay + 4, 28, 16);
    ctx.fillStyle = '#1C1C1C';
    ctx.beginPath(); ctx.arc(ax + 15, ay + 37, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 75, ay + 37, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#808080';
    ctx.beginPath(); ctx.arc(ax + 15, ay + 37, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 75, ay + 37, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F9E79F'; ctx.fillRect(ax + 2,  ay + 8, 5, 8);
    ctx.fillStyle = '#E74C3C'; ctx.fillRect(ax + 83, ay + 8, 5, 8);
  }

  // Planten strip (onderaan) — start na vijver (x=220), bollen steken boven rand uit
  ctx.fillStyle = '#1D6A35'; ctx.fillRect(220, 1062, 495, 38);
  const flwc = ['#E74C3C', '#F39C12', '#9B59B6', '#E91E63', '#F1C40F'];
  for (let px = 226; px < 714; px += 26) {
    ctx.fillStyle = '#196030';
    ctx.beginPath(); ctx.arc(px, 1060, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.arc(px, 1057, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath(); ctx.arc(px - 3, 1054, 7, 0, Math.PI * 2); ctx.fill();
  }
  for (let px = 238; px < 714; px += 42) {
    ctx.fillStyle = flwc[(px / 42 | 0) % flwc.length];
    ctx.beginPath(); ctx.arc(px, 1050, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F9E79F';
    ctx.beginPath(); ctx.arc(px, 1050, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // Bankjes (horizontaal)
  for (const b of [{ x: 305, y: 238, w: 75, h: 16 }, { x: 455, y: 648, w: 75, h: 16 }]) {
    ctx.fillStyle = '#4E342E'; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 10);
    ctx.fillStyle = '#8D5524';
    for (let sx = b.x; sx < b.x + b.w - 2; sx += 12)
      ctx.fillRect(sx + 1, b.y + 1, 10, b.h - 2);
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(b.x + 3, b.y + b.h, 8, 8);
    ctx.fillRect(b.x + b.w - 11, b.y + b.h, 8, 8);
  }
  // Bank (verticaal)
  { const b = { x: 558, y: 415, w: 16, h: 85 };
    ctx.fillStyle = '#4E342E'; ctx.fillRect(b.x - 2, b.y - 2, b.w + 10, b.h + 4);
    ctx.fillStyle = '#8D5524';
    for (let sy = b.y; sy < b.y + b.h - 2; sy += 12)
      ctx.fillRect(b.x + 1, sy + 1, b.w - 2, 10);
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(b.x + b.w, b.y + 3, 8, 8);
    ctx.fillRect(b.x + b.w, b.y + b.h - 11, 8, 8);
  }

  // Picknicktafel
  { const tx = 878, ty = 286;
    ctx.fillStyle = '#5D4037'; ctx.fillRect(tx, ty + 10, 78, 8);
    ctx.fillStyle = '#795548'; ctx.fillRect(tx + 2, ty + 11, 74, 6);
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(tx + 6,  ty + 18, 6, 28);
    ctx.fillRect(tx + 66, ty + 18, 6, 28);
    ctx.fillStyle = '#795548';
    ctx.fillRect(tx - 14, ty + 20, 14, 6); ctx.fillRect(tx + 78, ty + 20, 14, 6);
    ctx.fillRect(tx - 14, ty + 28, 14, 6); ctx.fillRect(tx + 78, ty + 28, 14, 6);
  }

  // Bloembakken
  function drawFlowerBox(fx, fy, fw, fh) {
    ctx.fillStyle = '#95A5A6'; ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = '#7F8C8D'; ctx.fillRect(fx + 3, fy + 3, fw - 6, fh - 6);
    ctx.fillStyle = '#6D4C41'; ctx.fillRect(fx + 5, fy + 5, fw - 10, fh - 10);
    ctx.fillStyle = '#1E8449';
    for (let px = fx + 10; px < fx + fw - 8; px += 13)
      ctx.beginPath(), ctx.arc(px, fy + fh * 0.45, 12, 0, Math.PI * 2), ctx.fill();
    ctx.fillStyle = '#27AE60';
    for (let px = fx + 13; px < fx + fw - 8; px += 13)
      ctx.beginPath(), ctx.arc(px, fy + fh * 0.38, 8, 0, Math.PI * 2), ctx.fill();
    const bfc = ['#E74C3C', '#F39C12', '#9B59B6', '#E91E63'];
    let bi = 0;
    for (let px = fx + 14; px < fx + fw - 10; px += 16, bi++) {
      ctx.fillStyle = bfc[bi % bfc.length];
      ctx.beginPath(); ctx.arc(px, fy + fh * 0.28, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F9E79F';
      ctx.beginPath(); ctx.arc(px, fy + fh * 0.28, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawFlowerBox(1138, 585, 72, 72);
  drawFlowerBox(748, 798, 58, 58);

  // Map grens
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, MW, MH);
} // einde drawBackgroundOLD_UNUSED

// ─── Drawing ─────────────────────────────────────────────────────────────────
function draw() {
  camera.x = Math.max(0, Math.min(CONFIG.mapWidth  - CANVAS_W, player.x - CANVAS_W / 2));
  camera.y = Math.max(0, Math.min(CONFIG.mapHeight - CANVAS_H, player.y - CANVAS_H / 2));

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground();

  for (const d of deathEffects) {
    ctx.globalAlpha = (d.life / d.maxLife) * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke();
  }
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const e of enemies) drawGoose(e);

  drawProjectiles();
  drawPasser();
  drawLiniaal();
  drawParasol();
  drawStudent();

  // ── Pickups (hartjes) ──
  for (const pk of pickups) {
    if (pk.type !== 'heart') continue;
    const hx = pk.x, hy = pk.y, s = 10;
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    // Hartje via twee cirkels + driehoek
    ctx.arc(hx - s * 0.5, hy - s * 0.3, s * 0.55, 0, Math.PI * 2);
    ctx.arc(hx + s * 0.5, hy - s * 0.3, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - s, hy - s * 0.1);
    ctx.lineTo(hx, hy + s);
    ctx.lineTo(hx + s, hy - s * 0.1);
    ctx.fill();
    ctx.restore();
  }

  // ── Debug: obstakels en spawnpunten (world space) ──
  if (DEBUG) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff0000';
    for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#0066ff';
    for (const o of POND_OBSTACLES) ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#00ff00';
    for (const p of ENEMY_SPAWN_POINTS) { ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#ffff00';
    for (const p of PLAYER_SPAWN_POINTS) { ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  // ── Screen space ──

  if (waveMessage) {
    const isBossMsg = waveMessage.text.startsWith('ALARM');
    ctx.globalAlpha = Math.min(1, waveMessage.timer / 0.5);
    ctx.fillStyle = isBossMsg ? '#FF2222' : '#fff';
    ctx.font = isBossMsg ? 'bold 44px sans-serif' : 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(waveMessage.text, CANVAS_W/2, CANVAS_H/2 - 20);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  elHP.textContent    = player.hp;
  elWave.textContent  = wave;
  elTimer.textContent = Math.floor(elapsed);

  // ── Debug overlay (screen space) ──
  if (DEBUG) {
  const bossProjs = projectiles.filter(p => p.fromBoss).length;
  ctx.save();
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  const dbgLines = [
    `pos:       x=${Math.round(player.x)}  y=${Math.round(player.y)}`,
    `wave:      ${wave}`,
    `enemies:   ${enemies.length}`,
    `proj:      ${projectiles.length - bossProjs} speler / ${bossProjs} boss`,
    `pickups:   ${pickups.length}`,
    `effects:   ${particles.length} particles / ${deathEffects.length} death`,
  ];
  dbgLines.forEach((line, idx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, CANVAS_H - 90 + idx * 15, 230, 14);
    ctx.fillStyle = '#00ff88';
    ctx.fillText(line, 8, CANVAS_H - 79 + idx * 15);
  });
  ctx.restore();
  } // end DEBUG
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
function loop(ts) {
  if (state !== 'playing') return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ─── UI Flow ─────────────────────────────────────────────────────────────────
function startGame() {
  resetGame();
  startMusic();
  overlay.classList.add('hidden');
  levelPanel.classList.add('hidden');
  state = 'playing';
  wavePhase = 'fighting';
  spawnEnemiesForWave(wave);
  waveMessage = { text: 'Wave 1!', timer: 1.5 };
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  state = 'dead';
  saveHighscore(wave, Math.floor(elapsed));
  overlayTitle.textContent = 'Game Over';
  overlayMsg.textContent   = `Je overleefde ${Math.floor(elapsed)}s en haalde wave ${wave}!`;
  overlayBtn.textContent   = 'Opnieuw spelen';
  updateHighscoreBox();
  overlay.classList.remove('hidden');
  playSound(sfxVerlies);
  setTimeout(() => playSound(sfxGanzenwinnen), 500);
}

function showLevelUp() {
  state = 'levelup';
  waveCompleteTitle.textContent = `Wave ${wave} voltooid!`;
  upgradeOpts.innerHTML = '';
  const pool    = buildUpgradePool();
  const choices = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  for (const u of choices) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `<h3>${u.name}</h3><p>${u.desc}</p>`;
    card.addEventListener('click', () => {
      if (u.weaponId) player.weapons[u.weaponId] = u.newLevel;
      else u.apply();
      levelPanel.classList.add('hidden');
      wave++;
      wavePhase = 'startingWave';
      betweenWavesTimer = CONFIG.waveBreakDuration;
      waveMessage = { text: `Wave ${wave} start!`, timer: CONFIG.waveBreakDuration };
      state = 'playing';
      lastTime = performance.now();
      requestAnimationFrame(loop);
    });
    upgradeOpts.appendChild(card);
  }
  levelPanel.classList.remove('hidden');
}

// ─── Geluid toggle ────────────────────────────────────────────────────────────
const soundToggleBtn = document.getElementById('sound-toggle');
soundToggleBtn.addEventListener('click', e => {
  e.stopPropagation();
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? 'Geluid: AAN' : 'Geluid: UIT';
  if (!soundEnabled) {
    Object.values(MUSIC_TRACKS).forEach(t => t.pause());
  } else if (state === 'playing' || state === 'levelup') {
    startMusic();
  }
});

// ─── Startscherm ─────────────────────────────────────────────────────────────
overlayBtn.addEventListener('click', startGame);
overlayTitle.textContent = 'Avans Gans Attack';
overlayMsg.innerHTML     = 'Overleef golven van boze ganzen!<br>Beweeg met WASD of de pijltjestoetsen.';
overlayBtn.textContent   = 'Start';
updateHighscoreBox();
overlay.classList.remove('hidden');

// ── Debug toggle (klein, rechtsboven in het venster) ─────────────────────────
const debugToggleEl = document.createElement('div');
debugToggleEl.style.cssText = 'position:absolute;top:36px;right:6px;font-size:11px;font-family:monospace;cursor:pointer;background:rgba(0,0,0,0.5);color:#aaa;padding:2px 6px;border-radius:4px;z-index:20;user-select:none;';
function updateDebugToggleLabel() {
  debugToggleEl.textContent = `dbg: ${DEBUG ? 'AAN' : 'UIT'}`;
}
updateDebugToggleLabel();
debugToggleEl.addEventListener('click', () => {
  DEBUG = !DEBUG;
  updateDebugToggleLabel();
});
document.getElementById('ui').appendChild(debugToggleEl);
