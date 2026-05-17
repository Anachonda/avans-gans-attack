# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sessie-start — verplicht lezen

Lees bij elke nieuwe sessie altijd eerst deze bestanden, in deze volgorde:

1. `ARCHITECTURE.md` — structuur, systemen, bestandsverantwoordelijkheden
2. `AI_RULES.md` — werkwijze, beperkingen, do's en don'ts
3. `FEATURES.md` — overzicht van alle huidige gameplay-mechanics

Stop met lezen zodra je genoeg context hebt voor de taak. Lees `game.js` nooit in zijn geheel.

## Running the Game

No build step required. Open `index.html` directly in any modern browser. There are no dependencies, no package manager, and no compilation needed.

## Architecture

This is a single-file vanilla JavaScript game (`game.js`) rendered on an HTML5 Canvas (800×600). The entire game logic lives in `game.js` (~2700 lines); `index.html` provides the canvas and UI overlays; `style.css` handles layout and the upgrade card UI.

### Game State Machine

A global `state` variable drives the game loop: `'idle'` → `'playing'` ↔ `'paused'` / `'levelup'` → `'dead'` → `'idle'`. The `requestAnimationFrame` loop exits immediately when `state !== 'playing'`.

### Core Systems

**Weapon system** — `WEAPON_DEFS` is the single source of truth. Each entry has parallel arrays indexed by `level - 1` (0–4): damage, cooldown, reach, etc. `player.weapons[id]` holds the current level (1-based); `player.cooldowns[id]` tracks the firing timer. Adding a weapon means editing `WEAPON_DEFS` + update/draw function + `WEAPON_SFX`.

**Evoluties** — Three weapon combinations unlock a one-time evolution: Koffiestroop (kauwgom+thermos), Boekentas (boek+rugzak), Stormparaplu (paraplu+passer). Stored as boolean flags on `player` (`player.koffiestroop`, etc.).

**Wave/upgrade loop** — On wave clear, `buildUpgradePool()` → `showLevelUp()` shows 3–4 cards. Pool includes weapon unlocks, weapon level-ups, stat boosts, and evolutions (always first if available).

**Enemy scaling** — Nine enemy types in `ENEMY_TYPES`. HP and speed scale with wave number via a square-root formula. New types unlock at fixed wave thresholds.

**Collision** — Everything is circle-distance based. `damageEnemy(i, dmg)` is the single entry point for damage. Player damage uses invincibility frames (`player.invincible`, configurable via `CONFIG.playerIframes`).

**Projectiles, particles & mines** — Flat arrays: `projectiles[]`, `particles[]`, `mines[]`. Each frame: update, then `swapRemove` expired entries.

### Key Helper Functions

| Function | Purpose |
|---|---|
| `getNearestEnemy()` | Returns closest enemy to player |
| `damageEnemy(i, dmg)` | Applies damage by index, triggers death/particles |
| `spawnParticles(x, y, color, count)` | Visual feedback particles |
| `startGame()` / `endGame()` | State transitions in/out of play |
| `showLevelUp()` | Builds upgrade cards and pauses game |
| `swapRemove(arr, i)` | O(1) removal from flat arrays |

### Dutch Terminology in Code

The game is a Dutch student project. Weapon names in code match Dutch school supplies: `paraplu` (umbrella), `boek` (book), `passer` (compass), `gum` (eraser), `thermos`, `liniaal` (ruler), `rugzak` (backpack), `kauwgom` (chewing gum). UI strings are also in Dutch.
