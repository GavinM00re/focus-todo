# Focus

A calm, responsive personal to-do list. Plain HTML, CSS, and JavaScript: no build step, external dependencies, account, tracking, or server required.

## Use it

- Add, edit, complete, and delete tasks. Deleted tasks and cleared completed tasks can be undone for 12 seconds.
- Add notes, a priority, and an optional due date. Switch between All tasks, Today, Upcoming, and Completed.
- Search titles and notes, filter priorities, and sort by creation time, due date, or priority. Completed tasks appear after open tasks.
- Toggle light/dark mode. Your system preference is used initially.
- Use **Export** to download a JSON backup. Open the site on another computer and **Import** that file. Import adds new task IDs, skips duplicates, and keeps existing tasks unchanged. It does not overwrite edits to existing tasks.
- Press Ctrl+K / Cmd+K to search. Forms and task actions work with the keyboard; Escape closes the task dialog.

**Storage:** Tasks are saved only in this browser's localStorage for this site's address. They are not synced between computers, browsers, profiles, or different site URLs. Clearing browser/site data deletes them. Private browsing may discard them. Export backups regularly. Opening the link on another computer adds the published starter entries once in that browser. This is initial project data, not cross-device sync: your edits, added tasks, and completion/deletion changes stay local. The app never uploads your browser task data to GitHub or another service. Clearing site data also removes the starter-entry receipts, so published entries will appear again on the next visit.

## Published starter entries and storage migration

`published-tasks.js` is the maintainable starter dataset, loaded before `app.js`. It currently contains one completed Cal Placenta task, six outstanding DANS staining tasks, and six separate outstanding Anodisc control tasks. The sample date belongs in notes, not the due-date field. Medium priority is the existing UI default, not an assessment of scientific urgency.

To add future entries, append tasks with permanent unique IDs. Do not reuse IDs. Existing browser tasks with a matching ID retain their local edits. Once an ID is applied, deleting or clearing that task does not restore it on reload. Updating a published entry will not overwrite a task already applied locally. Entries deferred by the 10,000-task limit can be added on a later reload when there is room.

The `focus.tasks.v1` storage key now holds a version-1 envelope with `tasks` and `appliedSeedIds`. The old array format and version-1 task backup objects are read automatically. Tasks and seed receipts are written in one atomic localStorage operation; failed migration keeps the original saved data and list unchanged. Unreadable data is never overwritten. Cross-tab storage events refresh both tasks and receipts, and stale saves are refused so the user can review and retry. This is not server synchronization or collaborative editing. After deployment, refresh all already-open site tabs before making changes: the older app code only understands array storage and cannot safely coordinate with the new envelope.

Export/import remains the existing version-1 JSON task backup format. Import adds missing task IDs and keeps existing edits. Backups transfer tasks, not per-browser starter-deletion receipts; importing does not remove tasks from the destination browser. For an unreadable saved list, Export offers the raw saved data for recovery.

**Publication privacy:** Starter entries are part of the static website and source repository. Anyone who can access those can read the starter data. Publish only entries explicitly approved for that visibility. Browser-created tasks, edits, and exported backups are not published by this app.

## GitHub Pages

1. Put `index.html`, `styles.css`, `published-tasks.js`, `app.js`, and `.nojekyll` in the repository root and push to the default branch.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select your default branch and **/ (root)**, then **Save**.
4. Wait for the Pages deployment to finish. Open the exact URL GitHub shows there, typically `https://USERNAME.github.io/REPOSITORY/`.

The repository and static website can be public; published starter data is public with them, while your browser edits and additional task data stay on each device. Do not commit exported task backups or private information. If you change the site's hostname/path, export first and import on the new address.

## Local development

Run in this folder:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. No installation/build step is needed. A current Chrome, Firefox, Edge, or Safari is recommended. Local file opening may behave differently for storage, so use a local server for development.

## Checks

```sh
node --check app.js
node --check published-tasks.js
npm test
```

Automated tests use the Node built-in test runner and isolated validation and storage function harnesses. Run `node --test tests/app.test.cjs`. Browser QA should additionally exercise the visible UI, keyboard flow, light/dark layouts, and export/import.

## Verification

- Syntax checks passed for the app, published dataset, and local server.
- All 19 automated tests pass. They cover validation, old arrays, backups, seed content, matching-ID edit preservation, repeat loads, deletion and clear persistence, future seeds, failed storage, corrupt-data protection, cross-tab refresh/stale saves, and full-list migration.
- Earlier browser checks covered add, edit, reload persistence, completion, Completed view, search no-results, delete/undo, and light/dark appearance. Managed-preview browser QA also verified all 13 starter entries, preservation of an existing edited local task, the completed starter task, no duplicates on reload, and a deleted starter task staying deleted after reload. The subsequent removal of name attribution was verified in source and automated tests.
- File-picker import/export and mobile viewport behavior still need manual browser verification.
