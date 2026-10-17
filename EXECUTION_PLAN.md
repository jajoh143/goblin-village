# Goblin Village MVP Execution Plan

## Recommended approach

Build the smallest playable loop with temporary CC0 assets, put it online early, and add content only after the control model works on a physical phone.

The critical technical risk is not combat or crafting. It is making direct control, goblin selection, contextual orders, and autonomous behavior feel understandable on a small touch screen. Prove that interaction before investing in final maps or artwork.

## Delivery estimate

For one developer working with coding assistance, expect roughly **18–28 focused development days**, plus elapsed time for external playtesting. This is an effort range, not a promised calendar date.

| Stage | Focus | Estimated effort | Exit checkpoint |
|---|---|---:|---|
| 0 | Decisions and prototype kit | 1–2 days | Rules and initial assets are locked |
| 1 | Technical foundation | 2–4 days | Playable shell runs on phone and desktop |
| 2 | Living-village prototype | 4–6 days | Switch and command multiple goblins |
| 3 | Complete progression loop | 5–8 days | Start-to-victory run is possible |
| 4 | Clarity, feel, and performance | 4–6 days | New testers can finish unaided |
| 5 | Release | 2 days | Public version 0.1 is live |

## Stage 0 — Make the remaining decisions

Complete GV-001 through GV-003 before building systems.

1. Write a one-page specification with exact death, respawn, selection, and order rules.
2. Create the initial numbers sheet, accepting that it will change after playtests.
3. Prototype at 16×16 world tiles rendered at an integer scale; test 32×32 characters if the 16×16 roster is not readable enough.
4. Select one coherent asset family for the prototype rather than mixing every promising pack.
5. Create `CREDITS.md` and record an asset before committing its files.

**Decision checkpoint:** Can we explain, in one sentence each, direct control, selecting another goblin, assigning a task, death, and victory?

## Stage 1 — Establish the web foundation

Complete GV-010 through GV-013 and the minimum of GV-020/GV-021.

1. Scaffold Phaser 3 + TypeScript + Vite without an additional UI framework.
2. Add formatting, linting, type checking, and unit tests for pure game-state code.
3. Create Boot, Preload, Title, Village, UI, and Results scenes.
4. Implement dedicated portrait and landscape compositions, safe-area CSS, responsive scaling, and fullscreen.
5. Build a unified action layer used by both keyboard and touch controls.
6. Make a gray-box village containing a home area, forest resource, mine resource, and hero entrance.
7. Deploy this walking build to a Cloudflare Pages preview URL.

**Decision checkpoint:** Can the player load the game from a link on iOS and Android, move comfortably, rotate or resume the browser, and use every displayed control?

## Stage 2 — Prove the living village

Complete GV-021A through GV-022 before adding multiple hero classes.

1. Model a stable roster of named goblins independently from Phaser sprites.
2. Implement the controlled, idle, moving, gathering, defending, attacking, fleeing, and dead states.
3. Tap a goblin to select it; use a clear action to take direct control.
4. Tap a resource, location, or hero to issue a contextual gather, defend, or attack order.
5. Display selection rings, controlled-goblin markers, destination/target feedback, and current assignment.
6. Add wood, stone, and iron nodes plus village inventory deposits.
7. Test with 3–6 active goblins and deliberately invalidate targets to prove AI recovery.

**Decision checkpoint:** Give a new tester a phone without instructions. Can they switch goblins and assign two workers within two minutes?

If not, fix command UX before continuing. Do not solve confusion by adding more tutorial text first.

## Stage 3 — Complete the game loop

Complete GV-023 through GV-034 in vertical slices.

### Slice A: danger and continuity

1. Add one fighter hero.
2. Add damage, telegraphs, defeat, loot, goblin death, memorials, and control transfer.
3. Add versioned local saves and reset-save behavior.

### Slice B: growth

1. Add build sites for the hut, smithy, and barricade.
2. Add shiv, club, and spear crafting.
3. Connect buildings and hero defeats to threat escalation.

### Slice C: coordination and victory

1. Add archer and wizard behaviors.
2. Add the final mixed-class raid.
3. Tune the raid so direct combat and assigned goblins are both useful.
4. Add the results screen and replay/continue options.

**Decision checkpoint:** Three internal playthroughs complete from new game to victory without debug tools, refresh-related data loss, or a stuck AI state.

## Stage 4 — Turn the prototype into an MVP

Complete GV-040 through GV-043.

1. Observe first-time playtests and add contextual onboarding only where the environment and UI cannot teach the rule.
2. Finish the HUD, selected-goblin inspector, menus, audio controls, and accessibility options.
3. Replace only the most visible placeholder assets; retain compatible CC0 assets elsewhere.
4. Add sound, particles, hit feedback, and restrained camera effects.
5. Compress PNG and audio files, atlas small sprites, and pool repeated objects.
6. Run 30-minute soak tests and profile AI updates on representative phones.

**Decision checkpoint:** At least three unfamiliar testers can finish, understand why they won or lost, and report that touch selection is reliable.

## Stage 5 — Release version 0.1

Complete GV-050 through GV-053.

1. Connect `main` to Cloudflare Pages with `npm run build` and output directory `dist`.
2. Require local/CI quality checks before merging release changes.
3. Verify HTTPS, loading, refresh, audio unlock, suspend/resume, rotation, saves, death, and victory on iOS Safari and Android Chrome.
4. Add metadata, social preview, credits, privacy statement, known issues, and feedback link.
5. Tag the exact deployed commit as `v0.1.0` and share the production URL.

## Dependency map

```text
spec + numbers + art choice
          |
          v
project shell -> responsive input -> gray-box map -> direct control
                                                    |
                                                    v
                                      roster -> AI -> commands
                                                    |
                                                    v
                                            gathering + save
                                                    |
                                                    v
                     fighter -> death/control transfer -> build/craft
                                                    |
                                                    v
                                 archer + wizard -> final raid -> victory
                                                    |
                                                    v
                               onboarding + polish -> phone QA -> release
```

## Branch and review rhythm

- Keep `main` playable and deployable.
- Use one short-lived branch per roadmap task or tightly related slice.
- Every merged task must include its acceptance-criteria check and avoid unrelated refactors.
- Publish a preview build at the end of every stage and use the URL for phone testing.
- Record balance observations separately from bugs so tuning does not destabilize core systems.

## Hosting decision

### Primary: Cloudflare Pages free plan

Use Cloudflare Pages for the MVP because this is a static Vite application and the source already lives on GitHub.

Why it fits:

- Git-connected automatic builds and preview deployments.
- Free static asset requests without a metered request charge.
- 500 builds per month on the free plan.
- Up to 20,000 files and 25 MiB per individual asset, comfortably above the intended MVP bundle shape.
- Free `pages.dev` HTTPS address with optional custom domain later.

Keep individual files below 25 MiB and optimize the entire initial download for mobile regardless of the host's limits.

### Fallback: GitHub Pages

GitHub Pages is simpler because the repository is already on GitHub and can deploy through Actions. It is a sound fallback for the MVP, but published sites have a 1 GB maximum and a soft 100 GB monthly bandwidth limit. Cloudflare Pages gives the game more breathing room if public playtests produce many asset downloads.

### Revisit hosting when

- Accounts, cloud saves, matchmaking, or authoritative leaderboards require a backend.
- A single asset needs to exceed 25 MiB.
- Traffic, abuse protection, analytics, or custom-domain needs outgrow the free tier.
- The game becomes commercial enough that host terms and support guarantees need a formal review.
