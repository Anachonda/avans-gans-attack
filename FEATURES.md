# FEATURES.md — Avans Gans Attack

Overzicht van alle huidige gameplay-systemen.

---

## Enemies

Vier typen, allemaal als gans getekend:

| Type | HP | Snelheid | Formaat | Bijzonderheid |
|---|---|---|---|---|
| `normal` | ×1.0 | ×1.0 | ×1.0 | — |
| `tank` | ×3.5 | ×0.6 | ×1.5 | Goud getint |
| `flyer` | ×0.7 | ×1.4 | ×0.85 | Negeert obstakels, paars |
| `bossGoose` | ×4.0 | ×1.3 | ×2.6 | Schiet projectielen, dropt hartje bij dood |

- HP en snelheid schalen mee met het wave-nummer
- Ganzen duwen elkaar weg via een spatial grid (separatie-systeem)
- Knockback bij treffer
- Spawnen uitsluitend vanuit de vijver (linksonder op de kaart)

---

## Wave system

- Elke wave: `waveNum + 2` vijanden
- **Elke vijfde wave** = baas-wave: bossGoosen + extra normale/tank-ganzen (aantal bosses = waveNum / 5)
- Na alle vijanden dood: 1 seconde pauze → upgrade-keuze → volgende wave
- Wave-melding verschijnt kort in beeld bij start en einde

**Vijandtypes per wave:**
- Wave 1: alleen normal
- Wave 2+: normal + tank
- Wave 3+: normal + tank + flyer
- Wave 5, 10, 15…: bossGoose-wave

---

## Weapons

Speler start met één willekeurig wapen. Elk wapen heeft 5 levels.  
Stats (schade, cooldown, bereik etc.) staan als arrays in `WEAPON_DEFS`.

| Wapen | Mechanisme | Bijzonderheid |
|---|---|---|
| **Paraplu** | Melee boogzwaai richting dichtstbijzijnde vijand | Level 5: dubbele zwaai |
| **Boekenworp** | Snel projectiel rechtdoor | Level 3+: doorboorend |
| **Passer** | 360° melee rondzwaai om speler | Vaste interval |
| **Gum** | Bouncend projectiel | Level 2+: wand-bounces |
| **Thermosbeker** | Projectiel dat vijanden vertraagt | Level 4+: splash-effect |
| **Liniaal** | Flitsende lijnstoot richting dichtstbijzijnde vijand | Hogere schade per treffer |
| **Rugzak** | Gooi-projectiel met splash-explosie | Groeiende splashstraal per level |

Wapens vuren automatisch op basis van cooldowns. Richting: altijd naar dichtstbijzijnde vijand.

---

## Upgrades

Na elke wave: 3 willekeurige kaarten kiezen uit:

**Wapen-upgrades:**
- Nieuw wapen ontgrendelen (level 1)
- Bestaand wapen een level omhoog (max level 5)

**Stat-upgrades:**
- Max HP +15 (en direct +15 HP)
- Snelheid ×1.05
- Diagonaalsnelheid +0.10 (minder vertraging in bochten, max 1.0)
- EHBO-kit: herstel 40 HP

---

## Collision

Alles cirkel-gebaseerd:
- **Speler ↔ vijand**: schade bij overlap + 0.6s iframes
- **Projectiel ↔ vijand**: via cirkelafstand, splash-wapens checken straal
- **Melee ↔ vijand**: boog/cirkel/lijn overlap per wapen
- **Speler/vijand ↔ obstakels**: AABB-rechthoeken (muren, auto's, bankjes, vijver)
- **Boss-projectielen ↔ speler**: aparte check, max 12 tegelijk

Bananenschillen op de grond laten de speler tijdelijk uitglijden (fallTimer).

---

## Mobile controls

- **D-pad**: één cirkel linksonder in beeld; richting bepaald door positie t.o.v. middelpunt
- Zichtbaar op mobiel (≤1024px), verborgen op desktop
- Verbergt automatisch bij overlay, pauze-panel en level-up scherm
- In landscape: d-pad `position:fixed` in de pillarbox links
- Canvas schaalt mee met viewport (iOS-safe via `window.innerWidth/Height`)
- PWA-installeerbaar via `manifest.json`; iOS install-banner bij Safari

---

## Audio

**Muziek** (automatische keten):
`Kwakkwak1` (×3) → `Kwakkwakjazz` → `Kwakkwakjameslast` → `Kwakkwakmetal` → terug naar `Kwakkwak1`

**SFX:**
- Elk wapen heeft eigen geluid bij afvuren
- `Auw.wav` bij spelerschade
- `Gans.wav` bij gansdood
- `Verlies.wav` + `Ganzenwinnen.wav` bij game-over
- `Baasgans.wav` bij baas-wave aankondiging
- `Ganspoep.wav` bij boss-projectiel
- `Banaan.wav` bij uitglijden

**Regels:**
- Max 10 gelijktijdige geluiden
- Volumes instelbaar per geluid via `CONFIG`
- Geluid-toggle: alles aan/uit
- Bij pauze: muziek gaat naar volume 0.025 (blijft spelen)

---

## UI

**HUD** (altijd zichtbaar tijdens spel):
- HP (rood), Wave (wit), Tijd in seconden (blauw), Avans-logo, Pauzeknop

**Overlays:**

| Scherm | Getoond bij | Knoppen |
|---|---|---|
| Startscherm | App-start of na hoofdmenu | Start, Geluid aan/uit, Collectie |
| Game-over | Speler dood | Opnieuw spelen, Hoofdmenu |
| Level-up | Wave voltooid | 3–4 upgrade-kaarten (+ eventueel reroll-knop) |
| Pauze | Pauzeknop / Escape | Doorgaan, Hoofdmenu |
| Collectie | Collectie-knop op startscherm | Koop upgrades, bekijk mijlpalen, Sluiten |

**Highscore-box** op startscherm: beste wave + beste tijd (opgeslagen in `localStorage`).

**Wave-berichten**: tekst midden in beeld, kort zichtbaar (fade op timer).

---

## Pause system

- **Pauzeknop** (⏸) in HUD, zichtbaar alleen tijdens gameplay
- **Escape-toets**: toggle pauze / hervatten
- Bij pauze: game loop stopt, muziek gaat zacht (vol 0.025)
- Pauzescherm: twee opties
  - **Doorgaan** — hervat spel, muziek terug naar normaal volume
  - **Hoofdmenu** — stopt muziek, terug naar startscherm
- Pauzeknop verbergt automatisch bij level-up, game-over en hoofdmenu

---

## Meta-progressie

Veertjes (`🪶`) zijn de valuta die tussen runs bewaard blijven (in `localStorage`).

**Verdienen:**
- 1 veertje per kill (2 met milestone *Ganzenjager*)
- +2 extra per boss-kill
- +1 elke vijfde kill (met upgrade *Verenjas*)
- 5 veertjes per wave-clear
- +1 per wave-clear (met milestone *Doorzetter*)
- +10 per wave-clear (met milestone *Held van Avans*, cumulatief met Doorzetter)

**Collectie-winkel — max 1 aankoop per run:**

| Tier | ID | Effect | Prijs |
|---|---|---|---|
| 1 | Stevige rugzak | +10 max HP | 80 |
| 1 | Sportschoenen | +5% snelheid | 100 |
| 2 | Thermoskan | Thermos gegarandeerd wave 1 | 200 |
| 2 | Veerkracht | Iframes 0.6 s → 0.85 s | 220 |
| 2 | Verenjas | +1 veertje per 5e kill | 250 |
| 3 | Vroege vogel | Extra random wapen bij start | 450 |
| 3 | Ganzenkenner | 4 upgrade-kaarten i.p.v. 3 | 500 |
| 3 | Herkansing | 1 reroll per run bij upgrades | 480 |

Tier 2 beschikbaar na ≥1 Tier-1-aankoop. Tier 3 na ≥2 Tier-2-aankopen.

**Startwapen kiezen:** ontgrendelt na alle drie Tier-3-items gekocht.

**Mijlpalen (automatisch, geen koop):**

| ID | Voorwaarde | Beloning |
|---|---|---|
| Ganzenjager | 100 kills totaal | +1 feather/kill |
| Veteraan | Wave 10 overleefd | Ereplaats |
| Doorzetter | 500 kills totaal | +1 feather/wave |
| Held van Avans | Wave 20 overleefd | +10 feathers/wave |
| Schoolkampioen | Wave 30 overleefd | Eer en roem |
