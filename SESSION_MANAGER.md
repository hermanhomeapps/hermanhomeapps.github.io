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
- `backend-scripts/*.gs` (gitignored, local-only — see debrief below)
- `.gitignore`

**Rules:**
1. Before editing a shared file, check the table below. If someone else has an `OPEN` claim on a file you need, don't edit it — tell the owner and wait, or ask them to confirm the other session is done.
2. Before you start editing a shared file, add a row (or update your existing one) with status `OPEN`.
3. The moment you're done editing that file for this turn, flip your row to `RELEASED` — don't leave stale `OPEN` claims sitting around.
4. Pick a short, stable session label (what you're working on) so the owner and other sessions can tell you apart across turns.

## Backend / deploy architecture — quick debrief

This site is 100% static (GitHub Pages) — every app (`shabbos-chores-points-lists-new`, `mommy-camp`, `new-app`) is a single self-contained `index.html` that talks to a **Google Apps Script Web App** as its backend (`doGet`/`doPost` against a Google Sheet or Drive folder). Backend code must never be committed to this repo since it's public — the `.gitignore` excludes `backend-scripts/` and `*.gs` entirely; that folder is a local-only working copy.

**One unified backend project (owner explicitly wants ONE `.gs` that does everything — do not re-split this):** `backend-scripts/hermanhomeapps-backend.gs` is deployed as a single Apps Script Web App. **The permanent exec URL is `AKfycbwJctPf1x6gGyipPT3jl1iuVmVgV6S-3CePmTykwV4birPAE8lMRLgrnw24ifwtxa23`** (owner confirmed this explicitly — it's the OLD Wizard Drafts project's URL, not the old Chores project's URL; this session initially got that backwards and pointed everything at the wrong one, since corrected). It handles THREE things off that one exec URL, routed by request shape (not URL) in `doGet`/`doPost`:
- Shabbos Chores + Mommy Camp point-tracking (Mommy Camp's tabs prefixed `camp_` to avoid colliding with Shabbos Chores' own `kids`/`points_log`)
- New App Wizard drafts, saved to a Drive folder (`FOLDER_ID` = `1zt4A8oaaUuH-MeVCEY62IGFZM3HdANRL`)
- The external-apps registry, a separate small Sheet opened by ID (`EXTERNAL_APPS_SHEET_ID`)

**Important: this script does NOT rely on being container-bound to the Chores Sheet.** It opens the Chores Sheet explicitly via `SpreadsheetApp.openById(CHORES_SHEET_ID)` (Sheet ID `1NVlbMvzIse-GO82ghtaSt1JRStoReB9fF6EzF2PcLEg`) everywhere, rather than `getActiveSpreadsheet()`. This was a real bug hit this session: the permanent deployment above lives in what was originally the standalone Wizard Drafts project, so `getActiveSpreadsheet()` returned `null` there and crashed every Chores/Camp request (`TypeError: Cannot read properties of null (reading 'getSheetByName')`) — fixed by switching to `openById` throughout. If this ever gets ported to a different/new Apps Script project again, `openById` means it'll keep working regardless of binding.

Wizard requests are detected by `action` being one of `list`/`load`/`listApps` (GET) or `save`/`discard`/`confirm` (POST); everything else falls through to the Chores/Camp sheet-CRUD logic (`sheet`/`upsert`/`delete`/`append`). The permanent exec URL is hardcoded in ALL FIVE places that call the backend: `shared/apps.json` (statusUrl ×2), `shabbos-chores-points-lists-new/index.html` + `mommy-camp/index.html` (`BACKEND_URL`), and `new-app/index.html` + root `index.html` (`APPS_SCRIPT_URL`) — all consolidated to match this session. The old two-file split (`shabbos-chores-backend.gs` / `wizard-drafts-backend.gs`) is retired; the old Chores-bound project (whatever was at the other URL) is no longer referenced anywhere and can be deleted whenever.

**Self-healing schema:** the merged `.gs` runs an `ensureSchema()`/`ensureAppsSheetSchema()` pass at the top of `doGet`/`doPost` that creates any missing sheet tab + header row, and appends any missing header columns to existing tabs — reconciled against a `TABS_SCHEMA` object hardcoded in the script (verified against a real xlsx export of the live Sheet, not guessed). It NEVER reorders/renames/deletes existing columns or touches existing data rows, and results are cached 6h via `CacheService` (bump `SCHEMA_VERSION` after any future schema edit to force an immediate recheck). `camp_kids` also auto-seeds the 3 default campers, but only the very first time that tab is created from nothing.

**Deploy is currently manual:** editing the `.gs` file locally does nothing live until you paste it into the Apps Script editor (script.google.com, the project serving the permanent URL above) and do **Deploy → Manage deployments → edit icon → Version: New version → Deploy** — just saving in the editor does NOT update the live exec URL.

**Manual schema trigger:** the deployed script also has a `setupSpreadsheet()` function (bottom of the file) you can run directly from the editor's function dropdown + Run button, no redeploy needed — clears the schema cache and force-runs `ensureSchema`/`ensureAppsSheetSchema` immediately instead of waiting for a live request. Uses `SpreadsheetApp.openById(CHORES_SHEET_ID)`, not `getActiveSpreadsheet()`, because running a function directly from the standalone editor has no "active spreadsheet" context (that only exists inside a real web app request) — `getActiveSpreadsheet()` returns `null` there and throws. **Confirmed working by owner:** ran it, `camp_kids`/`camp_points_log` tabs (+ seeded campers) were created successfully.

**In progress:** setting up `clasp` (Google's official Apps Script CLI, installed globally via npm) so a session can `clasp push`/`clasp deploy` directly instead of manual copy-paste. Blocked — see Outstanding below. Since there's now only one project, just need: its Script ID (Project Settings gear icon in the Apps Script editor) + its existing Deployment ID (Deploy → Manage deployments) so redeploys update the SAME url instead of minting a new one and breaking every hardcoded `BACKEND_URL`/`APPS_SCRIPT_URL` reference across the frontend.

**Also found:** this machine has a permanent root CA from "Techloq" (network content-filtering appliance) installed in the Windows trust store, intercepting/re-signing ALL HTTPS traffic including Google's OAuth endpoints. Node.js uses its own separate CA bundle (not Windows'), so `clasp login`'s token exchange fails with `unable to get local issuer certificate` until Node is told to trust it too (`NODE_EXTRA_CA_CERTS`) — the owner is confirming with Techloq first before that gets enabled site-wide for Node.

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
- [ ] Call Techloq, confirm the HTTPS interception on this machine is intentional/sanctioned, and confirm it's OK to make Node.js trust their root CA via `NODE_EXTRA_CA_CERTS` so `clasp login` can complete.
- [ ] Once cert issue resolved: run `clasp.cmd login` again to finish OAuth (previous attempt didn't save `~/.clasprc.json` — token exchange failed).
- [ ] Send the Script ID for the (now unified) backend Apps Script project (Project Settings gear icon in the editor).
- [ ] Send its existing Deployment ID (Deploy → Manage deployments), so `clasp deploy` updates the same live URL instead of creating a new one.

**Git / GitHub**
- [ ] None currently — collaborator access confirmed working (test push succeeded).

## Claims

| Session | File(s) | Status | Last updated | Notes |
|---|---|---|---|---|
