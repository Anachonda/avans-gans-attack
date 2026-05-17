# AI_RULES.md — Avans Gans Attack

Regels voor AI-assistenten die aan dit project werken.

---

## Leesvolgorde

Lees altijd in deze volgorde — stop zodra je genoeg weet:

1. `ARCHITECTURE.md` — structuur en systemen
2. `CLAUDE.md` — projectcontext
3. Alleen de relevante secties van `game.js` via Grep/offset+limit

Lees `game.js` **nooit in zijn geheel** tenzij expliciet gevraagd.

---

## Werkwijze

**Analyseer eerst, codeer dan.**

Voordat je iets wijzigt:
- Grep naar de exacte locatie
- Lees alleen het relevante blok (±30 regels context)
- Benoem in één zin wat je gaat veranderen en waarom

Stel geen vragen over dingen die je zelf kunt opzoeken.

---

## Wijzigingen

- Maak zo min mogelijk regels aan of verwijder ze
- Pas alleen aan wat de taak vereist — geen cleanup eromheen
- Geen nieuwe abstracties tenzij gevraagd
- Geen helper-functies voor eenmalig gebruik
- Drie vergelijkbare regels zijn beter dan een premature abstractie
- Geen backwards-compat shims voor verwijderde code

---

## game.js specifiek

- `CONFIG` is single source of truth voor alle getallen — voeg nieuwe tuning-waarden daar in
- `WEAPON_DEFS` is single source of truth voor wapens — nooit wapen-stats verspreiden
- `damageEnemy(i, dmg)` is het enige entry-point voor schade
- `swapRemove(arr, i)` voor O(1) verwijdering uit flat arrays — gebruik dit altijd
- Nieuwe wapens: voeg toe in `WEAPON_DEFS` + update/draw-functie + `WEAPON_SFX`
- Nieuwe evolutie: voeg toe in `buildUpgradePool()` + boolean flag op `player` in `resetGame()`
- Mijnen leven in `mines[]` (los van `projectiles[]`) — altijd via `swapRemove` verwijderen
- State wijzigen: altijd ook `pauseBtn` en `overlayMainMenuBtn` meenemen waar relevant

---

## Performance (mobile-first)

Dit spel draait op low-end mobiel. Elke frame telt.

- Geen `new Set()` / `new Array()` per frame — hergebruik bestaande objecten
- Geen `.filter()`, `.map()`, `.reduce()` in de hot path (`update`/`draw`)
- Gebruik `swapRemove` — nooit `splice` in een loop
- Sprite-cache-patroon (`_gooseSprites`) navolgen voor nieuwe getekende objecten
- Spatial grid (`_sepGrid`) gebruiken voor nieuwe proximity-checks op grote aantallen
- Geen `console.log` in de game loop

---

## Audio

- Volumes in `CONFIG.volumeXxx` — nooit hardcoded in de code
- `playSound(sfx)` voor sfx, nooit direct `.play()` aanroepen
- Max 10 gelijktijdige geluiden is een harde grens — niet verhogen
- Muziekvolume bij pauze: `VOLUME_PAUSED` (0.025) — niet aanpassen zonder reden

---

## CSS / HTML

- Nieuwe overlays: `position:absolute`, `inset:0`, `z-index:30`, `.hidden { display:none }`
- D-pad verbergen bij nieuwe panels: voeg selector toe aan de bestaande `~ #dpad` regel
- Geen inline styles voor layout — alles in `style.css`
- Touch-targets minimaal 36×36 px op mobiel

---

## Wat je niet doet

- Geen TypeScript, bundlers, frameworks of npm introduceren
- Geen `game.js` opsplitsen in modules
- Geen comments die uitleggen wat de code doet (namen doen dat al)
- Geen foutafhandeling voor scenario's die niet kunnen voorkomen
- Geen samenvatting aan het einde van je antwoord als de diff voor zich spreekt
