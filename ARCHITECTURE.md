# Architecture — Avans Gans Attack

## Bestanden

| Bestand | Verantwoordelijkheid |
|---|---|
| `game.js` | Alle spellogica (~2100 regels) |
| `index.html` | Canvas, HUD-DOM, overlays, d-pad HTML |
| `style.css` | Layout, overlays, responsive/mobile |
| `manifest.json` | PWA-config |
| `speelveldfinal.png` | Kaartafbeelding (1600×1200) |
| `Sounds/` | 4 muzieksporen + 14 sfx-bestanden |
| `Pics/` | Logo, GIF, overige afbeeldingen |

Geen build-stap, geen dependencies. Open `index.html` direct in browser.

---

## State machine

```
idle → playing ↔ paused
              ↕
           levelup
              ↓
            dead → idle
```

`let state` is de globale driver. De game loop stopt automatisch bij `state !== 'playing'`.

**wavePhase** (sub-state binnen `playing`):
`fighting → betweenWaves → choosingUpgrade → startingWave → fighting`

---

## Game loop

```js
function loop(ts) {
  if (state !== 'playing') return;   // stopt bij pauze/levelup/dead
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
```

Loop wordt handmatig herstart na pauze, upgrade-keuze en `startGame()`.

---

## Wereld & camera

- **Wereld**: 1600×1200 px logische ruimte
- **Canvas**: virtueel 800×600, geschaald via `devicePixelRatio` naar fysieke pixels
- **Camera**: `ctx.translate(-camera.x, -camera.y)` — volgt speler met clamp op wereldgrenzen
- **Obstakels**: hardcoded AABB-rechthoeken (`obstacles[]`, `POND_OBSTACLES[]`)
- **Kaart**: `speelveldfinal.png` als achtergrond op wereldcoördinaten

---

## Speler

```js
const player = {
  x, y, r,
  hp, maxHp, speed, diagMult,
  weapons: { weaponId: level },   // actieve wapens → level (1-based)
  cooldowns: {},                  // per wapen, in seconden
  swing, spinSwing, liniaalFlash, // actieve melee-animaties
  invincible,                     // iframes-timer (0.6s na treffer)
  fallTimer,                      // stilstand bij bananenschil
}
```

Startwapen is willekeurig bij elke reset.

---

## Wapenssysteem

**`WEAPON_DEFS`** is single source of truth. Elke entry heeft parallelle arrays geïndexeerd op `level - 1`.

| Wapen | Type | Mechanisme |
|---|---|---|
| `paraplu` | Melee swing | Boog richting dichtstbijzijnde vijand |
| `boek` | Projectiel | Recht, optioneel doorboorend |
| `passer` | Melee spin | 360° rondom speler |
| `gum` | Projectiel | Bouncing, wand-reflectie |
| `thermos` | Projectiel | Vertraagt vijanden, optioneel splash |
| `liniaal` | Melee flash | Lijnflits richting dichtstbijzijnde vijand |
| `rugzak` | Projectiel | Gooi met splash-explosie |

Elk wapen: max 5 levels. `player.weapons[id]` = level of undefined.  
Cooldown in `player.cooldowns[id]`, afgetrokken elke `dt` in `update()`.

---

## Vijandensysteem

```js
const ENEMY_TYPES = { normal, tank, flyer, bossGoose }
// hpMult, speedMult, sizeMult, color, ignoresObstacles
```

- Alle vijanden zijn "Ganzen", getekend via `drawGoose()` (offscreen sprite-cache: `_gooseSprites`)
- Spawn: vaste punten in vijver (`ENEMY_SPAWN_POINTS`), minimale afstand tot speler
- **Elke vijfde wave** = baas-wave (bossGoose + extra vijanden)
- **Separatie**: spatial grid (64px cellen) duwt ganzen uit elkaar; O(n) per frame
- `damageEnemy(i, dmg)` → enige entry-point voor schade → knockback, particles, `killEnemy(i)`
- `killEnemy` → geluid, death-effect, optioneel hartje pickup, verwijder via `swapRemove`

---

## Upgrades

Na elke wave: `buildUpgradePool()` → 3 willekeurige kaarten uit:
- Wapen ontgrendelen (level 1) of level-up (max 5)
- Stat-upgrades: Max HP +15, snelheid ×1.05, diagonaal-bonus, herstel 40 HP

Keuze toepast via `card.addEventListener('click', ...)` → `state = 'playing'` → loop herstart.

---

## Collision

Alles cirkel-gebaseerd:
- **Speler ↔ vijand**: cirkelafstand < r1 + r2 → contactschade + iframes
- **Projectiel ↔ vijand**: cirkelafstand → `damageEnemy()`
- **Speler/vijand ↔ obstakel**: AABB-overlap via `collidesWithObstacles(x, y, r, isPlayer)`

---

## Rendering (`draw()`)

Volgorde:
1. `ctx.scale(dpr, dpr)` + cameravertaling
2. Kaartafbeelding
3. Debris (blikjes, papierprop, bananenschil)
4. Particles (cirkel + globalAlpha fade)
5. Vijanden (`drawGoose` met offscreen cache)
6. Projectielen, melee-effecten (paraplu/passer/liniaal)
7. Pickups (hartjes)
8. Speler (`drawStudent`)
9. `ctx.restore()` → screen-space: wavebericht, HUD-tekst
10. Debug-overlay (obstakels, spawnpunten, stats)

---

## Audio

```
Muziek: main (×3) → jazz → jameslast → metal → main (loop)
```

- `playSound(sfx)`: cloneNode, max 10 gelijktijdig, auto-cleanup na `ended`
- `WEAPON_SFX`: koppelt weaponId aan sfx-object
- Volumes in `CONFIG.volumeXxx`
- **Pauze**: muziekvolume → 0.025; hervatten → `CONFIG.volumeMusic` (0.2)
- Geluid-toggle: pauzeert alle tracks, slaat `soundEnabled` op

---

## Input

| Bron | Mechanisme |
|---|---|
| Keyboard | `keys{}` object — `keydown`/`keyup` vullen het; `update()` leest het |
| D-pad | Eén cirkel-element, pointerdown bepaalt richting via hoek t.o.v. middelpunt → `keys[DPAD_KEYS[dir]]` |
| Escape | Toggle pause (`pauseGame()` / `resumeGame()`) |

---

## Mobile & responsive

- `resizeCanvas()`: schaalt `#ui` via JS op viewport (iOS-safe met `window.innerWidth/Height`)
- D-pad: verborgen op desktop (`display:none`), zichtbaar via `@media (max-width: 1024px)`
- HUD: `position:absolute` overlay op mobiel
- Landscape: d-pad `position:fixed` in pillarbox links
- PWA: `manifest.json` + iOS install-banner

---

## UI-flow functies

| Functie | Actie |
|---|---|
| `startGame()` | Reset, start muziek, state='playing', loop start |
| `endGame()` | state='dead', highscore opslaan, overlay tonen |
| `showLevelUp()` | state='levelup', bouw upgrade-kaarten |
| `pauseGame()` | state='paused', muziek dempen, pauze-panel tonen |
| `resumeGame()` | state='playing', muziek herstellen, loop herstart |
| `goToMainMenu()` | state='idle', muziek stoppen, startscherm tonen |

---

## Belangrijke helpers

| Functie | Doel |
|---|---|
| `swapRemove(arr, i)` | O(1) verwijdering uit flat array (swap met laatste) |
| `jitter(t)` | ±4% timing-variatie voor organisch wapenritme |
| `getNearestEnemy()` | Dichtstbijzijnde vijand voor aiming |
| `collidesWithObstacles(x, y, r, isPlayer)` | AABB-cirkel obstakel-check |
| `rand(min, max)` | `Math.random()` helper |
