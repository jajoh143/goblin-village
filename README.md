# Goblin Village

A phone-first, top-down action/roguelite village-builder made with Phaser and TypeScript.

Heroes have used Grubroot Village as a low-level grinding spot for generations. You play the goblins who finally fight back: gather resources, build defenses, steal adventurer gear, and turn an easy tutorial zone into a fortress.

## MVP

The first public version will be a short, replayable browser game built around one complete progression loop:

1. Directly control one goblin, then switch to another villager when needed.
2. Assign other goblins to gather wood, stone, or iron, defend an area, or attack a chosen hero.
3. Fight—or evade—heroes who arrive looking for easy XP.
4. Keep village resources and upgrades when an individual goblin dies.
5. Build a hut, smithy, and barricade.
6. Craft better equipment and defeat a final three-hero raid.

The MVP will support touch controls and keyboard controls, save progress locally in the browser, and deploy as a static website.

## Development

```bash
npm install
npm run dev
```

The initial control-test scene has dedicated portrait and landscape layouts. It supports WASD/arrow movement, Tab to cycle goblin selection, Enter to take control, and equivalent touch controls. On touch devices, tap a goblin once to select it and again to control it.

Run `npm run typecheck` and `npm run build` before merging changes.

## Project documents

- [MVP roadmap](./MVP_ROADMAP.md) — scope, tasks, and acceptance criteria.
- [Execution plan](./EXECUTION_PLAN.md) — build order, dependencies, checkpoints, and effort ranges.
- [Asset research](./ASSET_RESEARCH.md) — license-checked prototype art and audio candidates.
- [Asset credits](./CREDITS.md) — provenance and licensing for downloaded source assets.
