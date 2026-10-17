# Goblin Village MVP Roadmap

## Product target

Ship a polished 10–20 minute vertical slice that anyone can open from a link and play on a modern phone or desktop browser.

The player begins by directly controlling a weak goblin in Grubroot Village, while other villagers act autonomously or follow assigned jobs. The player can switch direct control to another goblin or select an individual villager and order them to gather, defend, or attack a specific hero. Together the village gathers resources, fights invading heroes, and improves across goblin deaths. The run ends when the village defeats a three-hero raid after constructing the smithy and barricade.

### Definition of done

- Playable in portrait and landscape modes on current iOS Safari, Android Chrome, and desktop Chrome/Firefox/Safari.
- Complete start-to-victory loop takes roughly 10–20 minutes on a first playthrough.
- Touch and keyboard controls both support every required action.
- The player can switch their directly controlled goblin and give individual villagers simple orders.
- Village inventory and upgrades survive player death and browser refresh.
- A first-time player can understand the objective without external instructions.
- Production build is publicly available over HTTPS from a stable URL.
- No progression-blocking bugs during a complete playthrough.

## Technical shape

- **Game:** Phaser 3 with TypeScript.
- **Build tooling:** Vite.
- **Rendering:** Pixel-art-friendly canvas using Phaser Scale Manager with dedicated portrait and landscape layouts.
- **Physics:** Phaser Arcade Physics.
- **Content:** Data-driven JSON or TypeScript configuration for resources, recipes, buildings, and hero stats.
- **Goblin behavior:** A shared command model and finite-state AI for idle, moving, gathering, defending, attacking, fleeing, and directly controlled states.
- **Persistence:** Versioned `localStorage` save data for the MVP.
- **Hosting:** Static deployment through Cloudflare Pages connected to the existing GitHub repository. Keep the build portable to GitHub Pages.
- **Backend:** None for the MVP.

## Scope guardrails

### Included

- One handcrafted village/forest map with a mine area.
- A small roster of individually selectable goblins with names and persistent identity.
- Direct control of one goblin at a time, with the ability to switch control.
- Individual gather, defend-position, and attack-target orders.
- Wood, stone, and iron.
- Shiv, club, and spear.
- Hut, smithy, and barricade.
- Fighter, archer, and wizard heroes.
- Melee/ranged combat, dodge, damage, death, and respawn.
- Local persistence, onboarding, audio controls, and a victory state.

### Deferred until after player feedback

- Accounts, cloud saves, leaderboards, or a server database.
- Multiplayer or social features.
- Drag selection, control groups, formations, queued orders, or full RTS-style army control.
- Complex worker schedules, priorities, needs, or colony simulation.
- Procedural maps and expeditions beyond the MVP map.
- Large crafting trees, quests, dialogue systems, or dozens of weapons.
- Native App Store/Play Store packaging.
- Installable/offline PWA behavior (the MVP can add a web manifest later without changing the game architecture).

## Milestone 0 — Lock the experience

### GV-001: Write the one-page game specification

Document the player fantasy, complete gameplay loop, direct-control and command modes, control scheme, win condition, fail/recovery behavior, and explicit non-goals.

**Acceptance criteria**

- The loop can be explained in five sentences or fewer.
- Every feature in the MVP supports the loop or onboarding.
- Ambiguous rules—especially what survives death—have a written answer.
- The specification explains when the player directly controls a goblin versus issuing an order.

### GV-002: Define the numbers sheet

Create initial values for player health, movement, attacks, hero stats, resource yields, recipes, build costs, spawn timing, and final-raid requirements.

**Acceptance criteria**

- All MVP balance values live in data/config rather than being scattered through scene code.
- A nominal first playthrough is estimated at 10–20 minutes.

### GV-003: Choose the prototype art direction

Lock a tile size, reference palette, camera scale, and temporary asset source. Use placeholder or license-compatible art until the loop is proven.

**Acceptance criteria**

- Character and environment scale are documented.
- Every external asset has its source and license recorded in `CREDITS.md`.
- Sprites remain readable on a phone-sized screen.

## Milestone 1 — A game that runs everywhere

### GV-010: Scaffold Phaser, TypeScript, and Vite

Create the application, lint/type-check/build scripts, basic scene structure, and asset folders.

**Acceptance criteria**

- `npm run dev`, `npm run build`, and `npm run preview` succeed.
- Boot, preload, title, game, UI, and results scenes have clear ownership.
- The production build opens without console errors.

### GV-011: Build responsive game framing

Create the game canvas, portrait and landscape compositions, safe-area handling, resize behavior, and fullscreen option.

**Acceptance criteria**

- No required control or HUD element is hidden by common phone safe areas.
- Resizing or rotating does not reset the session.
- Selection, direct control, and active orders survive an orientation change.
- Desktop presentation remains centered and usable.

### GV-012: Implement unified player input

Support keyboard movement/action and a touch layout with a virtual stick, attack, dodge, interact, select, and command controls.

**Acceptance criteria**

- Game systems consume abstract actions, not keyboard/touch events directly.
- Every gameplay action works with touch only and keyboard only.
- Touch controls prevent accidental page scrolling and browser zoom during play.
- Tapping a goblin selects it without accidentally moving or attacking.
- Tapping the selected goblin again, or using a dedicated button, takes direct control.

### GV-013: Add automated quality gates

Add type checking, linting, unit tests for non-visual systems, and a production-build check.

**Acceptance criteria**

- One command runs all checks locally.
- Pull requests or pushes run the same checks in CI.
- Save migration and resource arithmetic have unit tests.

## Milestone 2 — Prove movement, gathering, and survival

### GV-020: Create the MVP map

Build one compact map containing Grubroot Village, nearby forest resources, a mine, hero entrances, collision, and clear paths back home.

**Acceptance criteria**

- The player can reach every resource node and return to the village.
- Collisions and depth sorting work consistently.
- The entire useful play space is navigable on touch without precision frustration.

### GV-021: Implement direct goblin control

Add movement, animation states, facing/aiming, collision, health, hit feedback, dodge with cooldown, interaction targeting, and a clear controlled-goblin indicator.

**Acceptance criteria**

- Movement and combat feel responsive at both 30 and 60 FPS.
- Damage, invulnerability frames, and death are visually readable.
- No input can leave the player stuck in an invalid state.

### GV-021A: Implement goblin roster, selection, and control switching

Create a small persistent roster of named villagers. Allow the player to select an individual goblin, inspect its health/job/equipment, and transfer direct control to it.

**Acceptance criteria**

- Each living goblin has a stable ID, name, health, equipment, and current assignment.
- Touch and keyboard users can select a visible goblin and take direct control of it.
- The previously controlled goblin safely returns to autonomous behavior.
- The camera and HUD transfer cleanly without resetting combat or the world.
- Dead goblins cannot be selected; a valid successor is chosen if the controlled goblin dies.

### GV-021B: Implement autonomous goblin behavior

Add a small finite-state behavior system so uncontrolled goblins can idle, travel, gather, defend themselves, follow orders, and react to nearby danger.

**Acceptance criteria**

- Autonomous goblins do not require constant player input to remain safe and useful.
- Explicit player orders override default behavior until completed, invalidated, or cancelled.
- A goblin recovers to a safe state if its target disappears or pathing fails.
- AI updates are budgeted so several villagers remain performant on mobile.

### GV-021C: Implement individual goblin orders

Let the player select one goblin and assign a resource node, defense position, or specific hero as its target. Show the active order in the world and inspector UI.

**Acceptance criteria**

- Available commands are contextual: resource node means gather, ground means defend/move, and hero means attack.
- The player receives immediate visual confirmation of the order and target.
- Orders can be replaced or cancelled without leaving stale targets.
- A goblin reports an unreachable or invalid target instead of silently failing.
- The command flow is usable with taps and no precision-dependent gestures.

### GV-022: Implement resource gathering

Add wood, stone, and iron nodes, gathering interactions, node depletion/respawn, pickup feedback, AI gathering jobs, and the shared village inventory.

**Acceptance criteria**

- The HUD immediately reflects gathered resources.
- Resource values cannot become negative.
- Inventory ownership is clearly village-wide rather than tied to one goblin life.
- Assigned goblins travel to their resource target, gather, and deposit into the village inventory.

### GV-023: Add the first hero encounter

Implement a fighter hero with arrival, detection, chase, attack, damage, death, and a small loot drop.

**Acceptance criteria**

- The hero can threaten and kill an unprepared player.
- The player can evade or defeat the hero using readable tells.
- Hero AI recovers safely if navigation or targeting fails.

### GV-024: Implement death, respawn, and persistence

On death, memorialize the goblin, transfer control to a living successor or spawn one when necessary, preserve village resources/upgrades, and save versioned state locally.

**Acceptance criteria**

- Death never causes a full-page reload.
- Losing the controlled goblin transfers control without stopping the simulation.
- Other living goblins retain valid assignments across the transfer.
- Resources and buildings survive death and browser refresh.
- New game/reset save is available from settings with confirmation.
- Invalid or old save data fails safely rather than blocking the game.

## Milestone 3 — Build, craft, and fight back

### GV-030: Implement village building

Add designated build sites and construction for the hut, smithy, and barricade.

**Acceptance criteria**

- Build UI shows cost, purpose, affordability, and completed state.
- Costs are paid exactly once.
- Buildings visibly change the map and persist in the save.

### GV-031: Implement weapons and crafting

Add shiv, club, and spear with distinct reach/speed/damage profiles; use the smithy to craft upgrades.

**Acceptance criteria**

- Weapon differences are perceptible without reading raw stats.
- The equipped weapon is visible in the HUD and on the player if assets permit.
- Crafting cannot duplicate purchases or spend unavailable resources.

### GV-032: Add archer and wizard heroes

Implement ranged projectiles, telegraphed area attacks, spacing behavior, and class-specific loot.

**Acceptance criteria**

- Each class asks the player to respond differently.
- Projectiles and danger zones remain readable on a small screen.
- Mixed hero groups do not deadlock or overlap into an unreadable pile.

### GV-033: Add threat escalation and raid director

Advance threat through building and hero defeats. Telegraph incoming attacks and culminate in a fighter/archer/wizard raid that rewards direct control plus deliberate villager assignments.

**Acceptance criteria**

- The next escalation is understandable from the HUD or village feedback.
- Spawn timing cannot overwhelm a new player before basic crafting is possible.
- Constructing the smithy and barricade unlocks the final raid.
- The raid can be won by coordinating several goblins without requiring rapid multi-selection.

### GV-034: Implement the victory flow

End the MVP after the final raid with a results screen showing goblins lost, heroes defeated, resources gathered, and completion time.

**Acceptance criteria**

- Victory triggers exactly once and saves completion.
- The player can replay from a clean state or continue viewing the completed village.

## Milestone 4 — Make it understandable and pleasant

### GV-040: Add onboarding

Teach movement, goblin selection, control switching, orders, gathering, combat, death persistence, building, and the final objective through brief contextual prompts.

**Acceptance criteria**

- A first-time tester can finish without verbal coaching.
- Prompts never block combat or cover touch controls.
- Returning players can skip or disable onboarding.

### GV-041: Finish HUD and menus

Add resources, selected-goblin inspector, controlled-goblin marker, current assignment, health, equipped weapon, threat/raid status, pause, settings, credits, reset-save, and results UI.

**Acceptance criteria**

- All text is readable at the smallest supported phone size.
- Pause truly suspends simulation and audio appropriately.
- Menus work with touch and keyboard.

### GV-042: Add feedback, sound, and accessibility basics

Add hit flashes, particles, camera effects, sound/music, independent volume toggles, reduced-shake option, and high-contrast interaction cues.

**Acceptance criteria**

- Audio starts only after user interaction and recovers from app backgrounding.
- The game remains understandable while muted.
- Camera shake can be reduced or disabled.

### GV-043: Tune performance and loading

Compress assets, use texture atlases where useful, pool frequently spawned objects, and test on representative phones.

**Acceptance criteria**

- Stable play at the agreed performance target on representative iOS and Android devices.
- No unbounded object growth across a 30-minute session.
- Loading shows visible progress and handles asset failure gracefully.

## Milestone 5 — Publish the MVP

### GV-050: Configure production deployment

Connect the GitHub repository to Cloudflare Pages, configure the Vite production build, and publish the static build over HTTPS.

**Acceptance criteria**

- A push to the release branch builds and deploys automatically; pull requests receive preview deployments.
- Direct navigation, asset URLs, and refresh work at the hosted URL.
- The deployment URL is linked from the repository README.

### GV-051: Add lightweight release metadata

Add page title, description, social preview image, favicon, mobile theme color, and basic privacy-conscious error logging if desired.

**Acceptance criteria**

- Sharing the URL produces a recognizable Goblin Village preview.
- No player-identifying analytics or tracking is added without an explicit decision and disclosure.

### GV-052: Run a phone test matrix

Test loading, controls, audio, suspend/resume, rotation, save/reload, death, and victory on physical or cloud-hosted mobile browsers.

**Acceptance criteria**

- Smoke tests pass on iOS Safari and Android Chrome.
- Critical bugs are fixed; lesser issues are recorded with device/browser details.
- At least three people unfamiliar with the game complete a playtest.

### GV-053: Release version 0.1

Tag the tested build, publish short instructions and feedback guidance, and share the public URL.

**Acceptance criteria**

- The tagged commit matches the deployed build.
- Known issues and supported browsers are documented.
- Feedback has a clear collection channel.

## Suggested implementation order

The fastest path to evidence that the idea works is:

1. **Walking build:** GV-001 through GV-012, GV-020, GV-021.
2. **Living village:** GV-021A through GV-021C and GV-022.
3. **First danger:** GV-023 and GV-024.
4. **First meaningful loop:** GV-030, GV-031, and a single fighter wave.
5. **Feature-complete MVP:** GV-032 through GV-034.
6. **Public-ready build:** GV-040 through GV-053.

Do not wait for final art before completing the first meaningful loop. Replace placeholders only after gathering, combat, death, persistence, and building are enjoyable together.

## Post-MVP candidates

Use playtest evidence—not the original wish list—to prioritize these:

- Installable/offline PWA support.
- Additional goblin roles, traits, relationships, and procedural life histories.
- Group selection, control groups, patrol routes, formations, and queued orders.
- Traps, towers, and worker automation.
- Expeditions to ruins, farmland, roads, and the kingdom.
- More hero parties and named legendary heroes.
- Cloud saves, accounts, achievements, or leaderboards.
- Native mobile packaging.
