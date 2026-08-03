# BeamNG.drive 0.39 compatibility

Working notes for moving the overhaul from **0.38.4** to **0.39.2.1** (build 20887).
Records what has been fixed, what is still broken, and why each break happens.

## Why things break

Two mechanisms account for nearly everything below.

1. **Stale wholesale overrides.** Every file under `lua/ge/extensions/overrides/`
   replaces a base-game module outright via `overrideManager`. When the base game
   adds or renames a function on one of those modules, base-game code calling it
   hits `nil` — the mod's older copy is what actually loads. The mod's own callers
   stay self-consistent, so these surface only at runtime, in the parts of the
   game the mod does *not* override.

2. **A forked UI build.** `baseUI/` vendors the entire base-game Vue source and
   `ui/ui-vue/dist/` ships the compiled result over the game's own bundle. 0.39
   restructured that build, so 0.38.4 output no longer matches what the game loads.

---

## Completed

### Mod deactivated itself on 0.39 — *verified in game*

The headline bug: on 0.39 the mod switched itself off five seconds after launch,
dropping the player into unmodified career mode with no explanation beyond a
toast.

`checkVersion()` compared `versionParts[4]` against `"8"`, but `string.split()`
returns every *character* of the version string, dots included:

```
"0.39.2.1" -> { "0", ".", "3", "9", ".", "2", ".", "1" }
```

So it tested the fourth *character*. For `0.38.x` that is the `8` of `"0.38"` and
it passed by coincidence; for `0.39.x` it is `9`, the check failed, and
`core_modmanager.deactivateModId("RLSCO24")` ran.

Fixed by matching major/minor explicitly against a named `supportedGameVersion`
constant, so future bumps are a one-line change. Also guarded against
`integrity.json` being missing, which previously indexed a nil value.

### UI rebuilt against 0.39 — *builds clean, loads in game*

0.39 splits the UI into `index`, `embed` and `runtime`/`base` bundles and boots
from `runtime.js` + `base.js`. The mod shipped only `index.*`, so **none of its UI
loaded at all** on 0.39. `baseUI/` was re-vendored from 0.39 and rebuilt, which
required three code changes:

| Change | Reason |
|---|---|
| `LuaFunctionSignatures.js` rebased onto the 0.39 file | The fork imported `devutils/mock.js` and `devutils/browser.js`, both deleted in 0.39. 45 mod namespaces and 39 functions were re-applied on top of the 0.39 base, preserving base-game changes rather than reverting them. |
| `useLibStore` → `useBridge()` | `useLibStore` no longer exists. `$game.events` → `events`, `$game.lua` → `lua`. Affected `vehicleInventory/VehicleList.vue` and `refuel/RefuelMain.vue`. |
| `DEBUG_ONLY` blocks removed | 0.39 dropped the mechanism and the `@/utils` helpers (`runInBrowser`, `getMockedData`) they used. Affected `refuel/refuelStore.js`. |

Build output now matches the game's expected set: `base.*`, `embed.*`, `index.*`,
`runtime.js`, `runtime.dev.js`.

### Stale `gameContextStore` override removed

`ui-vue-src/services/gameContextStore.js` was a 0.38.4 copy adding nothing of its
own, while missing three things 0.39 introduced:

- the tutorial popup system (`OpenTutorialPopup` / `CloseTutorialPopup`,
  `TutorialPopupDialog`, `OptionalChallengeSelect`) — tutorial popups would never
  appear
- play-state detection via `lua.extensions.ui_router.getCurrent()`; the old copy
  still checked `window.location.hash`, which does not hold under the 0.39 router
- the `updateVersion` guard against overlapping activity-screen requests

None of this raises an error, it just silently stops working. Override deleted so
the base store is used.

---

### Starting modes restored — *verified in game*

Creating a new career was impossible: the New Profile screen rendered with an
empty "Start Mode" section, so there was nothing to click.

0.39 added starting modes (`/lua/ge/extensions/career/startingModes/*.lua`, one
table per entry point). `ProfileNew.vue` builds its list from
`career_career.getStartingModeOptions()` and catches failure with an empty array,
so the missing function produced a blank section rather than an error.

Ported `getStartingModeOptions`, `getCurrentStartingModeData` and the
`M.startingOptions` field. Also fixed an argument-shape mismatch: the base game
calls `createOrLoadCareerAndStart(name, specificSave, startingOptions)`, where
this mod's third parameter is a `tutorial` boolean — a table there is truthy, so
every new career would have started in tutorial mode with the selected mode
discarded.

APM Onboarding and Open World now both render and a new career starts loading.

### Career-profile API restored — *verified in game*

0.39 renamed the save-slot concept throughout. Implementations are identical, so
these went in as aliases:

| 0.38.4 (mod) | 0.39 (base game) |
|---|---|
| `getCurrentSaveSlot()` | `getCurrentProfile()` |
| `getAllSaveSlots()` | `getAllProfiles()` |
| `getAllAutosaves(slot)` | `getAllSaveFolders(profile)` |
| `setSaveSlot()` | `setProfile()` |
| `removeSaveSlot()` | `removeProfile()` |
| `sendAllCareerSaveSlotsData()` | `sendAllCareerProfilesData()` |
| `sendCurrentSaveSlotData()` | `sendCurrentProfileData()` |

Two needed more than an alias: `getNewestSave` (takes a full path where
`getAutosave` takes a slot name) and `getCurrentDisplayName` (a 0.39 concept the
mod lacks; callers already fall back to the folder name).

Symptom this fixes: the Career Profiles screen hung on "Loading…" because
`util/asyncBulkLoader.lua:326` calls `career_career.sendAllCareerProfilesData()`
to finish its load job. That call errored, the job died, and no profile data ever
reached the UI.

---

## Taxi work

The taxi job system is a shipped, tuned feature, not a work in progress:
`ReadMe.md:140` documents it ("Pick up passengers with 9 different passenger
types and fare tiers"), the store listing advertises it, and the module carries
56 commits including payout balancing and edge-case hardening. Anything broken
about it on 0.39 is port damage, and 0.38 is a valid working baseline to diff
against.

(The "Coming Soon" text in `gameplay/domains/careerSkills/skills/taxi/info.json`
is the career *skill progression* entry — a separate XP layer. It says nothing
about whether the job loop runs.)

### Namespace collision — *fixed*

The mod shipped `lua/ge/extensions/gameplay/taxi.lua` at the same path as a
base-game file and, uniquely among its 60 replacements, **not** under
`overrides/`. It shadowed the base module by VFS precedence — outside
`overrideManager`, and invisible to `tools/find_missing_api.py`, which only
scans `overrides/`.

The two are different features sharing three generic hooks:

| | mod | 0.39 base |
|---|---|---|
| Concept | you **drive** a taxi for fares | you **hail** a taxi and ride |
| API | `generateJob`, `acceptJob`, `rejectJob`, `prepareTaxiJob`, `stopTaxiJob`, passenger types, fare multipliers | `callForTaxi`, `confirmTaxiDestination`, `startTaxiWithCurrentRoute`, `isTaxiRideActive` |

Because the mod's table was truthy but lacked the base API, unmodified base code
broke: `freeroam/bigMapMode.lua:1070` calls `gameplay_taxi.isTaxiRideActive()`,
so **opening the world map threw** — under an error naming `gameplay_taxi`,
which points a debugger at entirely the wrong feature.

Renamed to `gameplay_taxiJobs`. `tools/find_missing_api.py` should be extended
to scan mod files shadowing base paths outside `overrides/` — today that is one
file, but it hid this whole class of bug.

### Outstanding for taxi

The taxi state machine itself is clean on 0.39: every base API it touches
(`gameplay_sites_sitesManager`, `gameplay_parking`, `map.getPointToPointPath`,
`career_modules_payment`, `career_modules_inventory`) still exists unchanged, and
its bridge declarations are complete. The blockers are around it:

1. **The world is grey in career** — see the grey-world section. Nothing is
   driveable until that is fixed.
2. **The phone never opens.** `gameplay/phone.lua:25` is the only route to the
   taxi UI, for both the phone key and taxi's own auto-open when a fare is
   offered (`taxiJobs.lua:967, 1189`). It uses
   `guihooks.trigger('ChangeState', {state = 'phone-taxi'})`, and **nothing in
   0.39's Vue app listens for `ChangeState` and navigates** — the only three
   listeners are unrelated cleanup and a legacy AngularJS rebroadcast. So no
   phone app works at all.

   Fixing it needs two parts, and the second is easy to miss:
   `ui_router.navigate` resolves against the **Lua** route tree
   (`ui/router/routeManager.lua`), not the Vue router, and static Vue routes are
   invisible to it — `ui/ui-vue/src/router/index.js:114` only syncs *runtime*
   routes. 0.39 provides `ui_router_routeManager.registerModRoutes(sourceId,
   routes, options)` (`routeManager.lua:631`) for exactly this. The mod uses
   neither today. Unresolved names are quiet: `W  Route not found: <name>`.

## Outstanding

From `tools/find_missing_api.py`. The tool classifies each call site:

- **LIVE** — base-game code that runs and will hit nil. Fix these.
- **shadowed** — the calling file is itself overridden by this mod, so it never
  runs. No action needed while that override exists.
- **guarded** — called as `mod.fn and mod.fn(...)`, so it degrades instead of
  erroring. Feature silently missing, no crash.

| # | Module | Live | Detail |
|---|--------|------|--------|
| 4 | `career_modules_playerAttributes` | 3 | `getCareerHistoryInfo`, `getFinancialHistory`, `getGameplayHistory` — pause-menu route provider. |
| 3 | `career_modules_vehicleShopping` | 3 | `requestExit`, `requestPurchaseExit`, `requestVehicleListExit` — 0.39 router exit handlers. |
| 3 | `career_modules_inventory` | 1 | `requestPickerExit` — router exit handler. |
| 6 | `career_modules_playerDriving` | 1 | `restoreTrafficAfterTutorialPhase` — tutorial step 05. |
| 5 | `core_recoveryPrompt` | 0 (guarded) | Pause-menu right-rail buttons; feature missing, no crash. |
| 6 | `gameplay_drift_saveLoad` | 0 (shadowed) | `clearCache`. |
| 2 | `career_career` | 0 (shadowed) | `getCurrentStartingModeData` — 0.39 starting-modes system. |
| 3 | `career_modules_inventory` | 0 (shadowed) | `getVehicleNiceNameTranslated`. |
| 7 | `gameplay_drag_utils` | module | **Deleted in 0.39** — logic moved to `phaseHandlers.lua` + `core.lua`. |
| 7 | `gameplay_drag_dragTypes_dragPracticeRace` | module | **Deleted in 0.39.** |
| 8 | bootstrap | — | `setExtensionUnloadMode` emits multi-KB error dumps for names 0.39 no longer knows. |

**9 live holes remain.** The router exit handlers (issues 3) are the most likely
next blocker, since 0.39 routes career screens through `ui/router/routeHandlers.lua`.

### Not yet investigated

- Career mode has not been entered successfully yet, so nothing past the profile
  screen has been exercised. Expect more holes once it loads.
- The ~10 overrides that appear to be pure staleness (mod adds <50 lines over the
  0.39 file) have not been audited individually. `gameContextStore` was one such
  and turned out to be safely deletable; others likely are too. Candidates, by
  lines added / dropped versus 0.39: `RefuelMain.vue` 47/260, `PriceFinder.vue`
  5/65, `FuelNozzle.vue` 7/39, `NegotiationChat.vue` 17/38, plus the small fuel
  components and `vehiclePurchaseStore`.

---

## Tooling

| Script | Purpose |
|---|---|
| `tools/find_missing_api.py` | Cross-references every override against its 0.39 counterpart and reports functions the base game calls but the override lacks, classified LIVE / shadowed / guarded. Run after each BeamNG update to get the worklist up front instead of one crash at a time. |
| `tools/merge_lua_signatures.py` | Rebases the mod's `LuaFunctionSignatures.js` additions onto a newer base-game copy, so the bridge does not have to be carried as a fork. |

Both hardcode the game path near the top; adjust for your install.

## Resuming this work

**Current state: a career loads, the loading screen clears, the menu closes and
the game reaches the play state — but the world renders as flat grey.**

### What the grey screen is *not* — all measured, do not re-investigate

**The decisive result: freeroam renders perfectly.** Loading `west_coast_usa` in
**freeroam with the mod active** gives a flawless world — full textures,
lighting, shadows, reflections. The identical level in **career** is flat grey.

That single comparison rules out, in one shot:

- the mod's `levels/west_coast_usa` overlay (same level, same files, fine in freeroam)
- any mod-wide render breakage (same mod loaded in both)
- the machine, drivers, Vulkan and graphics settings (same session)

**The grey is specific to the career activation path.** That is where to look,
and nowhere else.

Also individually eliminated, with evidence:

| Hypothesis | Verdict | Evidence |
|---|---|---|
| ImGui frame corruption | **dead** | fixed by removing the stale minimap overrides; `[imgui-error]` went 5/frame to zero, world still grey |
| Lighting / postfx | **dead** | ScatterSky initialises fully (8404 stars, grids, constellations); no postfx or tonemapper errors |
| Materials | **dead** | exactly one missing texture in a whole session, two unmapped materials; a real failure would be thousands |
| Shaders | **dead** | no compile failures logged |
| UI covering the viewport | **dead** | Alt+U hides the UI entirely; grey remains, geometry visible as untextured silhouettes |
| Stuck native material-debug flag | **dead** | reproduces in fresh processes; that flag is in-process state with no disk persistence |
| `clearLevels.lua` deleting assets | **dead** | deployed `levels/` intact after a full run — 1161 files, identical to the repo |
| Leaked full-screen `ui_gameBlur` region | **dead** | masked blur reads the already-rendered colour buffer; it softens, it cannot erase texture and lighting to flat grey |

### The live lead: the career load path's handoff out of loading

The visual character — soft-edged, desaturated, over-bright, correct geometry —
resembles the treatment BeamNG applies *behind* the loading screen. Career and
freeroam differ precisely in how they leave that state:

- Freeroam goes through `freeroam_freeroam.startFreeroam()` and lets it finish;
  the extension releases its own loading tag as part of completing startup.
- The overhaul **unloads `freeroam_freeroam`**, so that never happens. The
  `levels` tag is likewise released through `serverConnection.disconnect()`'s
  state machine, which does not complete on the career path.

The current code force-releases both stranded tags in
`overrides/career/career.lua` (`releaseStrandedLoadingScreenTags`). That
correctly *hides* the loading screen — verified — but hiding it is not the same
as completing the transition the base game would have run. **The hypothesis to
test next: the career path never performs whatever render-state handoff normally
accompanies the end of loading, so the world keeps being drawn in its
loading-time state.**

Concrete next steps:

1. Instrument the freeroam path and the career path side by side and diff what
   runs after the last loading tag is released — `server.fadeoutLoadingScreen()`,
   `core_gamestate` transitions, `commands.setGameCamera`, and anything
   `freeroam_freeroam` does on completion that the overhaul skips.
2. Try letting `freeroam_freeroam` finish starting up before unloading it,
   rather than unloading it and force-releasing its tag afterwards.
3. Compare `core_gamestate.state` between a working freeroam session and a grey
   career session at the same point.

### Route naming — the likely root cause

0.39 namespaced every career route and nested them:

| | Routes | Naming |
|---|---|---|
| 0.39 base | 33 | `career.computer.vehicleShopping.vehicles` |
| Mod | 71 | `computer`, `vehicleShopping`, `profiles` |

`ui-vue-src/modules/career/routes.js` replaces the whole table with flat 0.38
names, while 0.39's Lua references the namespaced ones 58+ times. The ~38 extra
routes are genuine mod features (phone, loans, car meets, garages, auctions) and
must be kept — namespaced — not dropped.

0.39 also added `ui/router/routeHandlers.lua`, which resolves back/exit buttons
by name to `career_modules_*.request*Exit()`. Those functions are missing from
the mod's overrides (issue 3), so backing out of the vehicle shop, part shop or
inventory picker does nothing.

### Next steps, in order

1. Run the freeroam control test described above to confirm or drop the blur
   lead. **Do this first** — it decides whether the route rebase fixes rendering
   or is merely correctness work.
2. Rebase `ui-vue-src/modules/career/routes.js` onto 0.39's namespaced,
   nested table, keeping the mod's own routes.
3. Add the router exit handlers (issue 3).
4. Resolve `Unknown app: messagesTasksApps`.
5. Work down the LIVE list above.
6. Lower priority: `loadVehicleOffers: unknown vehicle filterId 'fleetVehFilter'
   / 'policeFleetVehFilter' / 'exoticVehFilter'` from
   `overrides/career/modules/delivery/generator.lua`.

### Loading screen never cleared — *fixed, verified*

Loading a career left the loading screen up forever with the world fully built
behind it. The screen only hides once every outstanding request is released, and
two were stranded on the career path — confirmed by instrumenting the tags:

```
careerLoading = false     freeroam   = true    <- stranded
levels        = true      server.lua = false   <- stranded
```

`freeroam` is taken by `freeroam_freeroam.startFreeroam()` and released when that
extension finishes starting up — but the overhaul unloads it. `levels` is taken
by `core_levels.startLevel()` and released through
`serverConnection.disconnect()`'s state machine, which does not complete here.
Neither raises an error: holding a request is entirely legal, so the symptom is
just a screen that never goes away.

Both are now released once the vehicle group has spawned and the camera has been
handed over, at which point level loading is complete by definition.

### Menu never closed after load — *fixed, verified*

With the loading screen gone, the Career Profiles menu stayed on top of the
loaded world. Two causes, both in the `career.lua` override:

- `closeAllMenus()` still called `guihooks.trigger('ChangeState', {state =
  'play'})`. 0.39 drives navigation through `ui_router` and that trigger no
  longer moves the UI — the base game has the identical line commented out
  directly above its `extensions.ui_router.navigate("play")` replacement.
- The level-load branch of `activateCareer` never called `closeAllMenus()` at
  all, where the base game calls it in the same callback.

### Route naming — still outstanding

0.39 namespaced every career route under `career.*` (`career.computer`,
`career.profiles`, `career.computer.vehicleShopping`, …) and the base game's Lua
references those names 58+ times. This mod's `ui-vue-src/modules/career/routes.js`
replaces the whole route table with the old flat names (`computer`, `profiles`,
…) and its Lua navigates via `guihooks.trigger('ChangeState', {state = '<flat>'})`.

It has not caused a visible failure yet, but it is the most likely cause of the
next round of "screen does not open" bugs. 0.39 also split profiles into three
routes/components (`ProfileSelect`, `ProfileNew`, `ProfileSaveSelect`) where the
mod has one `Profiles.vue` — which the base game no longer routes to at all, so
the mod's profile screen is currently dead code.

Worth considering: rebase `routes.js` onto the 0.39 file the same way
`LuaFunctionSignatures.js` was, keeping the mod's own routes and letting the
overlaid views (`ComputerMain.vue`, `VehicleShoppingMain.vue`, …) be picked up
automatically, since `ui-vue-src/` overlays `baseUI/src/` at identical paths.

### Testing note

Do not test with **profile 3** — it is an Italy career, and
`rls_career_overhaul_italy_1.4.zip` is inactive in the mods folder, so it loads
Italy with no facilities and looks like a port bug. Use a fresh profile or one of
the West Coast saves.

Environment used (Linux, native build — no Proton):

| | |
|---|---|
| Game | `~/.steam/debian-installation/steamapps/common/BeamNG.drive` |
| Binary | `BinLinux/BeamNG.drive.x64 -nosteam` |
| User folder | `~/.local/share/BeamNG/BeamNG.drive/current/` |
| Mod install | `<user folder>/mods/unpacked/rls_career_overhaul/` |

Deploy and run loop:

```bash
# Mirror the 9 shipped directories into the user folder as REAL FILES.
# Symlinks look like they work but silently prevent modScript.lua from running.
for d in challenges gameplay levels lua mod_info music scripts ui vehicles; do
  rsync -a --delete "$d/" "$USERDIR/mods/unpacked/rls_career_overhaul/$d/"
done

# Always kill the previous instance first - two instances race and the second
# dies ~3s in, which looks like a mod crash but is not.
pkill -f 'BinLinux/Beam[N]G'

cd "$GAME" && DISPLAY=:1 ./BinLinux/BeamNG.drive.x64 -nosteam > game.log 2>&1
```

Read `game.log` rather than the user folder's `beamng.log` — the latter is
rotated at startup and appears truncated.

Rebuilding the UI after touching `ui-vue-src/`:

```bash
./build_ui.sh    # needs Node >= 22.18; ~2 min, runs five vite passes
```

## Notes for reviewers and future porters

- **Install unpacked as real files, not symlinks.** A symlinked
  `mods/unpacked/<mod>/` mounts and reports its files, but `FS:findFiles('/scripts/')`
  does not see through the symlinks, so `modScript.lua` never runs and the entire
  Lua layer silently fails to bootstrap — with no error anywhere.
- **Base-game files are CRLF, this repo is LF.** Diff with `tr -d '\r'` or
  `diff --strip-trailing-cr`; otherwise every file appears 100% changed and the
  real deltas are invisible.
- **Doc comments are not reliable as specification.** At least one is attached to
  the wrong function — in `extensionManager.lua` the `unloadAllExtensions`
  description sits above `removePhoneBinding`. Changes here were made against the
  code, not the comments.
- `overrideManager` swallows load failures (`pcall` → `return nil`), so a broken
  override surfaces as an unrelated nil later. Worth instrumenting when debugging.
