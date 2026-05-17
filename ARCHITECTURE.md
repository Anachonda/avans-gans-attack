# Architecture — Avans Gans Attack

## Bestanden

| Bestand | Verantwoordelijkheid |
|---|---|
| `game.js` | Alle spellogica (~2700 regels) |
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
  // (DEBUG: meet update- en render-tijd apart)
  if (hitStop > 0) { hitStop--; } else { update(dt); }
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt);
  draw();
  requestAnimationFrame(loop);
}
```

Loop wordt handmatig herstart na pauze, upgrade-keuze en `startGame()`.

---

## Wereld & camera

- **Wereld**: 1600×1200 px logische ruimte
- **Canvas**: virtueel 800×600, geschaald via `devicePixelRatio` (gecapped op 2) naar fysieke pixels
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
| `boek` | Projectiel | Recht, optioneel doorboorend (level 3+) |
| `passer` | Melee spin | 360° rondom speler |
| `gum` | Projectiel | Bouncing, wand-reflectie (meer bounces per level) |
| `thermos` | Projectiel | Vertraagt vijanden, optioneel splash (level 4+) |
| `liniaal` | Melee flash | Lijnflits richting dichtstbijzijnde vijand |
| `rugzak` | Projectiel | Gooi met splash-explosie (groeiende straal) |
| `kauwgom` | Mijn | Legt mijn neer op grond; schade + vertraging bij contact |

Elk wapen: max 5 levels. `player.weapons[id]` = level (1-based) of undefined.  
Cooldown in `player.cooldowns[id]`, afgetrokken elke `dt` in `update()`.

**Evoluties** — Eenmalige upgrades die twee wapens combineren, opgeslagen als booleans op `player`:

| Vlag | Vereiste | Effect |
|---|---|---|
| `player.koffiestroop` | kauwgom + thermos | Mijnen → koffievlekken (vaste hoge stats) |
| `player.boekentas` | boek + rugzak | Boek-treffer → mini-explosie 55px |
| `player.stormparaplu` | paraplu + passer | Na passer-spin → 6 messen in 360° |

---

## Vijandensysteem

```js
const ENEMY_TYPES = {
  normal, tank, flyer, bossGoose,
  splitter, splitterSmall,   // splitter splitst bij dood
  zwerm,                     // snel, klein, in drietallen
  supertank, supertankShard  // supertank versplintert bij dood
}
// hpMult, speedMult, sizeMult, color, ignoresObstacles
```

| Type | Unlocked | Bijzonderheid |
|---|---|---|
| `normal` | wave 1 | — |
| `tank` | wave 2 | Langzaam, veel HP, goudkleurig |
| `flyer` | wave 3 | Negeert obstakels, paars |
| `bossGoose` | wave 5, 10… | Schiet projectielen, dropt hartje |
| `splitter` | wave 7 | Splitst in twee `splitterSmall` bij dood |
| `zwerm` | wave 15 | Extreem snel, klein, spawnt in drietallen |
| `supertank` | wave 21 | Blauw, groot; berstoring → kettingreactie van `supertankShard` |

- Alle vijanden getekend via `drawGoose()` (offscreen sprite-cache: `_gooseSprites`)
- Spawn: vaste punten in vijver (`ENEMY_SPAWN_POINTS`), minimale afstand tot speler
- **Elke vijfde wave** = baas-wave (bossGoose + extra vijanden)
- **Separatie**: spatial grid (`_sepGrid`, 64px cellen) duwt ganzen uit elkaar; O(n) per frame
- `damageEnemy(i, dmg)` → enige entry-point voor schade → knockback, particles, `killEnemy(i)`
- `killEnemy` → geluid, death-effect, optioneel hartje pickup, verwijder via `swapRemove`
- Eerste verschijning van elk nieuw type: aankondiging via `NEW_ENEMY_ANNOUNCE`

---

## Upgrades

Na elke wave: `buildUpgradePool()` → 3–4 willekeurige kaarten uit:
- Wapen ontgrendelen (level 1) of level-up (max 5)
- Stat-upgrades: Max HP +15, snelheid ×1.05, diagonaal-bonus, herstel 40 HP
- Evolutie (gegarandeerd eerste kaart als twee vereiste wapens aanwezig en evolutie nog niet actief)

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
1. `ctx.scale(scaleX, scaleY)` (canvas/800×600) + cameravertaling
2. Kaartafbeelding
3. Debris (blikjes, papierprop, bananenschil)
4. Death-effects + particles (cirkel + globalAlpha fade)
5. Mijnen (`drawMines`)
6. Vijanden (`drawGoose` met offscreen cache)
7. Projectielen, melee-effecten (paraplu/passer/liniaal)
8. Pickups (hartjes)
9. Speler (`drawStudent`)
10. `ctx.restore()` → screen-space: wavebericht, HUD DOM-updates (getrotteld)
11. Debug-overlay: positie, entities, FPS, update-ms, render-ms, DPR (toggle via debug-knop)

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
