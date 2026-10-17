# Goblin Village Prototype Asset Research

## Acquisition status

The recommended CC0 prototype kit was downloaded and validated on October 16, 2026. Original extracted files live under `assets/source/`; none are part of a shipping bundle yet. Four music candidates were audited individually rather than trusting the collection-level description.

- 1,824 source files acquired.
- Approximately 69 MB of unoptimized source material.
- No empty files or unrecognized direct-download responses found.
- No source file exceeds Cloudflare Pages' 25 MiB per-file limit, although raw audio must still be compressed before release.
- Provenance is recorded in `CREDITS.md` and the original Kenney license files are preserved inside their pack directories.

## Asset strategy

Use **CC0-only assets for the first prototype** wherever practical. CC0 minimizes attribution and redistribution friction, but every downloaded file must still be checked against its own source page before it enters the repository.

Do not treat an OpenGameArt collection page as proof that every linked item has the same license. Record the exact item page, author, license, download date, and any attribution request in `CREDITS.md`.

The leading visual option is a 16×16 Kenney-based world because Tiny Town, Tiny Dungeon, Roguelike Characters, Pixel UI, and Input Prompts Pixel share a compact pixel-art vocabulary. The separate 32×32 goblin animation is useful for interaction tests but may need adaptation to match that world.

## Recommended prototype kit

| Need | Candidate | License | Proposed use | Notes |
|---|---|---|---|---|
| Village and overworld | [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) | CC0 | Ground, paths, trees, village props | 130 files at 16×16; strongest base for the village |
| Mine and interiors | [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | CC0 | Mine, stone, walls, weapons, dungeon props | 130 files at 16×16 |
| Goblins and heroes | [Kenney Roguelike Characters](https://kenney.nl/assets/roguelike-characters) | CC0 | Prototype roster and hero silhouettes | 450 files; inspect animation coverage before committing to final art |
| Alternate goblin structures | [Goblin Caves](https://opengameart.org/content/goblin-caves) by Hyptosis | CC0 | Goblin keep/cave tiles and visual references | 16×16; test palette compatibility with Kenney |
| Animated goblin test | [GOBLIN FREE PIXELART](https://opengameart.org/content/goblin-free-pixelart) by thekingphoenix | CC0 | Direct-control animation prototype | 32×32 idle/run/attack/death, but side-facing coverage may not suit final top-down play |
| Fighter/archer/wizard parts | [Fantasy RPG Sprite Kit](https://opengameart.org/content/fantasy-rpg-sprite-kit-32x32) by DezrasDragons | CC0 | Construct recognizable hero classes | 32×32 modular parts; attribution appreciated but not required |
| HUD and menus | [Kenney UI Pack – Pixel Adventure](https://kenney.nl/assets/ui-pack-pixel-adventure) | CC0 | Buttons, panels, sliders, selected-goblin inspector | 500 files |
| Input/tutorial glyphs | [Kenney Input Prompts Pixel](https://kenney.nl/assets/input-prompts-pixel) | CC0 | Keyboard, mouse, controller, and touch prompts | 800 glyphs at 16×16 |
| Combat and gathering SFX | [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | CC0 | Footsteps and weapon/foley sounds | 50 files |
| Additional combat SFX | [Fantasy Sound Effects](https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx) by Vehicle | CC0 | Arrows, blades, coins, pouches, impacts | 96 WAV files; convert selected clips to compressed web formats |
| Menu SFX | [UI Sound Effects](https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications) by Robin Lamb | CC0 | Select, confirm, error, victory, and defeat cues | OGG files already available |
| Music | Individually audited tracks listed in `CREDITS.md` | CC0 | Town, forest, battle, and final-raid candidates | Four tracks acquired; collection page was used only for discovery |

## What to test before adopting an art pack

### Character readability test

Create one phone-sized mock scene containing:

- Three green goblins with different equipment.
- One fighter, archer, and wizard.
- Selection ring, direct-control marker, order target, health, and hit flash.
- Forest, village, and mine tiles visible at the intended camera zoom.

Reject or modify the combination if testers cannot identify the controlled goblin, selected goblin, hero class, or current target at a glance.

### Animation coverage test

Before committing to a character pack, verify:

- Four-direction idle and movement, or a deliberate two-direction alternative.
- Melee attack, ranged attack/cast, hit, and death needs.
- Consistent frame dimensions, anchors, and silhouettes.
- Recoloring options for a roster of named goblins.

Static Kenney roguelike characters are excellent for system prototyping, but the final direct-control combat may require custom sprites or generated animation sheets.

### Visual consistency test

Prefer one source family per category. If OpenGameArt material is mixed with Kenney material:

- Normalize tile scale without fractional resizing.
- Limit the shared palette.
- Match outline weight, contrast, shadows, and view angle.
- Avoid mixing side-view character animation with top-down terrain unless the result is intentional.

## Asset acquisition order

1. Download Tiny Town, Tiny Dungeon, Roguelike Characters, Pixel Adventure UI, Input Prompts Pixel, and RPG Audio from their original Kenney pages.
2. Preserve original archives outside the shipped `public` directory; copy only used, optimized files into the game.
3. Record source URLs, creator, exact license, and download date in `CREDITS.md`.
4. Build the character-readability mock scene.
5. Evaluate Goblin Caves and the animated goblin only where the Kenney kit has a clear gap.
6. Add OpenGameArt audio one clip at a time after checking the individual item license.
7. Create or generate custom final sprites only after the living-village control test passes.

## Expected gaps requiring custom work

- A coherent four-direction animated goblin roster with equipment variants.
- Distinct fighter, archer, and wizard combat animations in the same style.
- Goblin hut, smithy, and barricade construction/damaged states.
- Selection rings, assigned-job markers, paths, and attack-target indicators tailored to the command UX.
- Title treatment, social preview, favicon, and store-quality key art.

These are good candidates for custom pixel work or image-generation-assisted reference sheets after the mechanics have proven the needed dimensions and animation list.
