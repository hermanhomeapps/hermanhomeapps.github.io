**This file is the standing-instructions file for every Claude Code session in this project, not just a file-edit lock.** Read it in full at the start of any new chat, before doing anything else — it's where cross-session coordination, durable how-things-work knowledge, and any instruction the owner wants remembered all get folded in over time. If the owner gives an instruction meant to apply beyond the current turn, add it here (in whichever section fits, or a new one) rather than letting it live only in that conversation.

Standing instructions:
1. Always tell the owner exactly what to do once an update is finished. Do not assume they'll remember.
2. Always expect to be given more instructions, and add them here when that happens.
3. Maintain the "Things Not Yet Confirmed Manually Complete" section below — log every manual action item there (not just in chat), and at the end of any turn where a task completes, give a short debrief of everything still outstanding in that section (not just what this session added).

# SESSION_MANAGER.md — cross-session edit coordination

This repo (`hermanhomeapps.github.io`, a public GitHub Pages static site) may get worked on across multiple Claude Code sessions/days. This file is how they avoid stepping on each other when editing the same file — there's no real-time link between sessions, so this is a manual, advisory lock: read it before editing a shared file, claim your file(s) here, release when done.

**Shared files to watch:**
- `index.html` (homepage hub)
- `shared/apps.json`, `shared/dock.js` (drive every app's homepage tile + nav dock — used by ALL apps)
- `new-app/index.html`
- `shabbos-chores-points-lists-new/index.html`
- `mommy-camp/index.html`
- `backend-scripts/` (gitignored, local-only — see debrief below; canonical backend source is `backend-scripts/clasp-project/Code.js`)
- `.gitignore`

**Rules:**
1. Before editing a shared file, check the table below. If someone else has an `OPEN` claim on a file you need, don't edit it — tell the owner and wait, or ask them to confirm the other session is done.
2. Before you start editing a shared file, add a row (or update your existing one) with status `OPEN`.
3. The moment you're done editing that file for this turn, flip your row to `RELEASED` — don't leave stale `OPEN` claims sitting around.
4. Pick a short, stable session label (what you're working on) so the owner and other sessions can tell you apart across turns.

## Backend / deploy architecture — quick debrief

This site is 100% static (GitHub Pages) — every app (`shabbos-chores-points-lists-new`, `mommy-camp`, `new-app`) is a single self-contained `index.html` that talks to a **Google Apps Script Web App** as its backend (`doGet`/`doPost` against a Google Sheet or Drive folder). Backend code must never be committed to this repo since it's public — the `.gitignore` excludes `backend-scripts/` and `*.gs` entirely; that folder is a local-only working copy.

**One unified backend project (owner explicitly wants ONE `.gs` that does everything — do not re-split this):** canonical source is `backend-scripts/clasp-project/Code.js` (a real clasp-managed project — see the clasp workflow section below; there is no longer a separate standalone `.gs` copy, that got retired to avoid drift). Deployed as a single Apps Script Web App. **The permanent exec URL is `AKfycbwJctPf1x6gGyipPT3jl1iuVmVgV6S-3CePmTykwV4birPAE8lMRLgrnw24ifwtxa23`** (owner confirmed this explicitly — it's the OLD Wizard Drafts project's URL, not the old Chores project's URL; this session initially got that backwards and pointed everything at the wrong one, since corrected). It handles THREE things off that one exec URL, routed by request shape (not URL) in `doGet`/`doPost`:
- Shabbos Chores + Mommy Camp point-tracking (Mommy Camp's tabs prefixed `camp_` to avoid colliding with Shabbos Chores' own `kids`/`points_log`)
- New App Wizard drafts, saved to a Drive folder (`FOLDER_ID` = `1zt4A8oaaUuH-MeVCEY62IGFZM3HdANRL`)
- The external-apps registry — its own `external_apps` tab in the SAME main Sheet (migrated off a separate spreadsheet this session, managed by the same generic `ensureSchema`/`TABS_SCHEMA` system as every other tab, including a row-1 note seeded via `TAB_NOTES`)

**Important: this script does NOT rely on being container-bound to the Chores Sheet.** It opens the Chores Sheet explicitly via `SpreadsheetApp.openById(CHORES_SHEET_ID)` (Sheet ID `1NVlbMvzIse-GO82ghtaSt1JRStoReB9fF6EzF2PcLEg`) everywhere, rather than `getActiveSpreadsheet()`. This was a real bug hit this session: the permanent deployment above lives in what was originally the standalone Wizard Drafts project, so `getActiveSpreadsheet()` returned `null` there and crashed every Chores/Camp request (`TypeError: Cannot read properties of null (reading 'getSheetByName')`) — fixed by switching to `openById` throughout. If this ever gets ported to a different/new Apps Script project again, `openById` means it'll keep working regardless of binding.

Wizard requests are detected by `action` being one of `list`/`load`/`listApps` (GET) or `save`/`discard`/`confirm` (POST); everything else falls through to the Chores/Camp sheet-CRUD logic (`sheet`/`upsert`/`delete`/`append`). The permanent exec URL is hardcoded in ALL FIVE places that call the backend: `shared/apps.json` (statusUrl ×2), `shabbos-chores-points-lists-new/index.html` + `mommy-camp/index.html` (`BACKEND_URL`), and `new-app/index.html` + root `index.html` (`APPS_SCRIPT_URL`) — all consolidated to match this session. The old two-file split (`shabbos-chores-backend.gs` / `wizard-drafts-backend.gs`) is retired; the old Chores-bound project (whatever was at the other URL) is no longer referenced anywhere and can be deleted whenever.

**Self-healing schema:** the script runs a single `ensureSchema(ss)` pass at the top of `doGet`/`doPost` (including the wizard-request branches) that creates any missing sheet tab + header row (+ a row-1 note if one's defined in `TAB_NOTES`), and appends any missing header columns to existing tabs — reconciled against a `TABS_SCHEMA` object hardcoded in the script (verified against a real xlsx export of the live Sheet, not guessed). It NEVER reorders/renames/deletes existing columns or touches existing data rows, and results are cached 6h via `CacheService` (bump `SCHEMA_VERSION` after any future schema edit to force an immediate recheck). `camp_kids` also auto-seeds the 3 default campers, but only the very first time that tab is created from nothing.

**Manual schema trigger:** the deployed script also has a `setupSpreadsheet()` function (bottom of the file) you can run directly from the editor's function dropdown + Run button — clears the schema cache and force-runs `ensureSchema` immediately instead of waiting for a live request. Uses `SpreadsheetApp.openById(CHORES_SHEET_ID)`, not `getActiveSpreadsheet()`, because running a function directly from the standalone editor has no "active spreadsheet" context (that only exists inside a real web app request) — `getActiveSpreadsheet()` returns `null` there and throws. Same reason `doGet`/`doPost` themselves use `openById` everywhere rather than relying on container binding (real bug hit and fixed this session — see git history if curious).

## clasp workflow — deploy is now automated, no more manual copy-paste

**Fully set up and verified working this session.** From `backend-scripts/clasp-project/` (gitignored, has its own `.clasp.json`):
- **Script ID:** `1a1TOi-hw7hkPL26C798nyg_xYwm7ZMnRLEPOxwt8qXDi39J0bfQwFB7X`
- **Permanent deployment ID** (same string as the exec URL slug): `AKfycbwJctPf1x6gGyipPT3jl1iuVmVgV6S-3CePmTykwV4birPAE8lMRLgrnw24ifwtxa23`

**To ship a backend code change:**
```bash
cd backend-scripts/clasp-project
# edit Code.js with the change
clasp.cmd push
clasp.cmd deploy -i AKfycbwJctPf1x6gGyipPT3jl1iuVmVgV6S-3CePmTykwV4birPAE8lMRLgrnw24ifwtxa23 -d "description of the change"
```
`clasp push` uploads a new saved version; `clasp deploy -i <that deployment id>` is what actually makes it live at the existing permanent URL — omitting `-i` would create a brand new deployment (new URL) instead, breaking every hardcoded `BACKEND_URL`/`APPS_SCRIPT_URL` reference across the frontend, so always include it.

**Auth:** `clasp login` was blocked most of this session by the Techloq TLS interception (see below) — now resolved, `~/.clasprc.json` holds valid credentials for `hermanhome613@gmail.com`. If a future session needs to re-auth, just `clasp.cmd login` again (opens a browser). Also requires the Apps Script API toggle to be ON at script.google.com/home/usersettings for `clasp deploy` (not `push`) to work — owner already enabled this.

**Techloq TLS interception — resolved:** this machine has a permanent root CA from "Techloq" (a network content-filtering appliance the owner intentionally uses) installed in the Windows trust store, intercepting/re-signing ALL HTTPS traffic. Node.js uses its own separate CA bundle (not Windows'), so `clasp login`'s token exchange failed with `unable to get local issuer certificate` until fixed. Techloq's own support instructions (confirmed legitimate, owner contacted them directly): download their bundled cert from cert.techloq.com, then `setx NODE_EXTRA_CA_CERTS "<path to .crt file>"` (a NEW terminal window is required after `setx` for it to take effect — this tripped us up twice). Owner's cert ended up at `C:\Users\kurku\Downloads\2023 techloq bundle certificate.crt`. If clasp (or any other Node-based tool) starts throwing the same cert error again on this machine, check that env var still points to a real, existing file first — same fix applies to `pip`/`npm`/`git`/etc. via their own respective CA-bundle settings, per Techloq's instructions, if those tools are ever needed too.

## Things Not Yet Confirmed Manually Complete

Running, cumulative list of manual action items other sessions are waiting on the owner for — deploying a file, setting a config value, testing something against a live system, anything that requires a human hand outside the coding environment. Belongs here, not just in a chat reply that scrolls away.

**Process for every session:**
1. Whenever your work leaves something for the owner to do manually, add it here as a checklist item under the right feature heading (create a new heading if it's a new feature).
2. At the END of any turn where you complete a task — whether or not you personally added anything here — re-read this whole section and give a short debrief of everything still outstanding, not just your own session's items.
3. Only check off / remove an item once the owner has explicitly confirmed they did it — "the code is ready" from a session doesn't count, only their own confirmation does.
4. Keep items short and action-oriented (what to click/paste/run), not status narration — the Claims log below is where the narrative/history lives.

### Outstanding

**Backend deploy / schema fix**
- [x] Paste `backend-scripts/hermanhomeapps-backend.gs` (unified — replaces BOTH old `.gs` files) into the project serving the permanent URL, replacing everything there, then redeploy. — **Owner confirmed: redeployed.**
- [x] `camp_kids`/`camp_points_log` tabs actually created + seeded. — **Owner confirmed:** ran the `setupSpreadsheet()` manual-trigger function from the editor, tabs now exist in the Sheet with the 3 default campers.
- [x] Paste the `openById(CHORES_SHEET_ID)` fix and redeploy. — **Owner confirmed: redeployed as v13.** Verified live: full data dump at the permanent URL now correctly includes a top-level `camp_kids` key with all 3 seeded campers, and Mommy Camp renders live in the browser with an editable point card. (First request right after the v13 redeploy hit a one-off Apps Script cold-start error page — retried immediately and succeeded; not a recurring issue.) **This backend is now fully working end-to-end.**
- [ ] Optional cleanup: delete the old, now-unreferenced Chores-bound Apps Script project in script.google.com (whatever was serving the old `AKfycbx2...` URL) — nothing points at it anymore.

**clasp sync/redeploy setup**
- [x] Call Techloq, confirm the HTTPS interception is intentional, get their cert setup instructions. — **Owner confirmed:** contacted them directly, they provided legitimate setup steps, cert downloaded to `C:\Users\kurku\Downloads\2023 techloq bundle certificate.crt`, `NODE_EXTRA_CA_CERTS` set correctly.
- [x] `clasp.cmd login` completes successfully. — **Owner confirmed:** logged in as `hermanhome613@gmail.com`, `~/.clasprc.json` verified present.
- [x] Script ID + permanent Deployment ID collected (see clasp workflow section above).
- [x] End-to-end push→deploy pipeline verified working. — Ran a real `clasp push` + `clasp deploy -i <deployment id>` (after also enabling the Apps Script API toggle, a one-time requirement), confirmed live data still serves correctly afterward (version bumped to @15 on the same permanent URL). **clasp is fully operational — no more manual copy-paste into the Apps Script editor needed going forward.**

**Git / GitHub**
- [ ] None currently — collaborator access confirmed working (test push succeeded).

**Recipe Generator & Saver — backend built (2026-07-31)**
- [ ] Optional cleanup: two throwaway test images (`test-verify.png`, `_verify_delete_me.png`) got uploaded to Drive while verifying the new `uploadPhoto` action — safe to delete from the "HermanHomeApps — Recipe Photos" folder whenever, no data depends on them.

**Shabbos Chores UX fixes (2026-07-31, 8 commits pushed, GitHub Pages auto-deploys)**
- [ ] Owner to verify: "Save Colors" now refreshes the open kid profile card's color live instead of needing a close/reopen — couldn't test in-browser since Mommy mode needs the PIN, which this session didn't have.
- [ ] Owner to verify: modal/drawer z-index was unified into one shared counter (previously drawers and overlays had separate ranges, causing modals opened from within an open drawer — Assign, Add Chore, etc. — to render behind it). Should fix both the "assign shows under the screen" and "add chore goes back to main screen" reports, since the owner confirmed both were the same underlying issue.
- [ ] Owner to verify: "Assigned" filter tab in the Chores drawer now shows only chores still in progress, not old completed ones (completed chores are still preserved forever for points history — only this tab's filter changed, not the data).
- [ ] Owner to verify: chore cards in the Chores drawer now show all management actions (Edit/Load/Unload/Assign/Split/Delete/Move/Complete/etc.) directly inline instead of behind a "See Details" popup — worth a look to confirm the buttons aren't too cramped on a real phone screen.
- [ ] Owner to verify: "Print Jobs" button (new) in the Chores drawer opens a print-formatted job list grouped by kid.
- [ ] Owner to verify: everywhere a plain "+1 Done" button used to appear for repeatable/consistent chores (chore cards, the split/group modal, the chore detail popup, and a kid's profile "Assigned Chores" list), there's now an amount field plus +/- buttons so multiple completions can be logged at once instead of tapping "+1 Done" repeatedly.

## Claims

| Session | File(s) | Status | Last updated | Notes |
|---|---|---|---|---|
| chores-ux-fixes | shabbos-chores-points-lists-new/index.html | RELEASED | 2026-07-31 | Completed all 9 items from owner's list, pushed as 8 separate commits (see git log). Frontend-only, no backend/clasp changes needed. Details in "Things Not Yet Confirmed" below — several fixes need live manual verification since I couldn't get into Mommy mode without the PIN. |
| recipe-generator-and-saver | backend-scripts/clasp-project/Code.js | RELEASED | 2026-07-31 | Added 7 new `recipe_`-prefixed tabs to TABS_SCHEMA (recipe_people, recipe_pantry_items, recipe_pantry_history, recipes, recipe_ingredients, recipe_favorites, recipe_kitchen_slots), a new `uploadPhoto` doPost action (finds/creates a "HermanHomeApps — Recipe Photos" Drive folder, saves file, sets link-viewable, returns URL), and a `?status=recipe` doGet branch. Bumped SCHEMA_VERSION to 2. Deployed as @16, fully verified live (all 7 tabs read correctly, status endpoint works, uploadPhoto tested end-to-end with a real image that loads publicly). No changes to existing Chores/Camp/Wizard logic. Next up (not yet done): add hub tile entry to shared/apps.json, then build the frontend at recipe-generator-and-saver/index.html. |
