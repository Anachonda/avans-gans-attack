# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step required. Open `index.html` directly in any modern browser. There are no dependencies, no package manager, and no compilation needed.

## Architecture

This is a single-file vanilla JavaScript game (`game.js`) rendered on an HTML5 Canvas (800×600). The entire game logic lives in `game.js` (~816 lines); `index.html` provides the canvas and UI overlays; `style.css` handles layout and the upgrade card UI.

### Game State Machine

A global `state` variable drives the game loop: `'idle'` → `'playing'` ↔ `'levelup'` → `'dead'` → `'idle'`. The `requestAnimationFrame` loop skips updates when not in `'playing'` state.

### Core Systems

**Weapon system** — `WEAPON_DEFS` is the single source of truth. Each weapon entry contains parallel arrays indexed by level (0–4): damage, cooldown, reach, etc. Weapons are stored as slots on the `player` object; each slot tracks `active`, `level`, and the current cooldown in `player.cooldowns`. Adding or rebalancing a weapon means editing `WEAPON_DEFS` and its corresponding update/draw functions.

**Wave/upgrade loop** — On wave clear, `showLevelUp()` picks 3 random options from a pool of weapon unlocks, weapon level-ups, and stat boosts (HP, speed, heal). Upgrading a weapon either sets `active = true` (first unlock) or increments `level`.

**Enemy scaling** — Enemy tier is derived from wave number; tier controls HP and speed via multiplier arrays. All enemies are "Geese" drawn procedurally with `drawGoose()`.

**Collision** — Everything is circle-distance based. `damageEnemy(enemy, dmg)` is the single entry point for dealing damage and spawning hit particles. Player damage uses invincibility frames (`player.iframes`, 0.6 s).

**Projectiles & particles** — Both live in flat arrays (`projectiles[]`, `particles[]`). Each frame they are updated and any that are expired or out-of-bounds are spliced out.

### Key Helper Functions

| Function | Purpose |
|---|---|
| `getNearestEnemy()` | Returns closest enemy to player |
| `damageEnemy(e, dmg)` | Applies damage, triggers death/particles |
| `spawnParticles(x, y, ...)` | Creates visual feedback particles |
| `startGame()` / `endGame()` | State transitions in/out of play |
| `showLevelUp()` | Builds upgrade choices and pauses game |

### Dutch Terminology in Code

The game is a Dutch student project. Weapon names in code match Dutch school supplies: `parasol`, `boek` (book), `passer` (compass), `gum` (eraser), `thermos`, `liniaal` (ruler), `rugzak` (backpack). UI strings are also in Dutch.
