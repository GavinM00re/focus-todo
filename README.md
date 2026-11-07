# Focus

A calm, responsive personal to-do list. Plain HTML, CSS, and JavaScript: no build step, external dependencies, account, tracking, or server required.

## Use it

- Add, edit, complete, and delete tasks. Deleted tasks and cleared completed tasks can be undone for 12 seconds.
- Add notes, a priority, and an optional due date. Switch between All tasks, Today, Upcoming, and Completed.
- Search titles and notes, filter priorities, and sort by creation time, due date, or priority. Completed tasks appear after open tasks.
- Toggle light/dark mode. Your system preference is used initially.
- Use **Export** to download a JSON backup. Open the site on another computer and **Import** that file. Import adds new task IDs, skips duplicates, and keeps existing tasks unchanged. It does not overwrite edits to existing tasks.
- Press Ctrl+K / Cmd+K to search. Forms and task actions work with the keyboard; Escape closes the task dialog.

**Storage:** Tasks are saved only in this browser's localStorage for this site's address. They are not synced between computers, browsers, profiles, or different site URLs. Clearing browser/site data deletes them. Private browsing may discard them. Export backups regularly. Opening the link on another computer works, but its list starts empty until you import a backup. No task data is sent to GitHub or any other service by the app.

## GitHub Pages

1. Put `index.html`, `styles.css`, `app.js`, and `.nojekyll` in the repository root and push to the default branch.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select your default branch and **/ (root)**, then **Save**.
4. Wait for the Pages deployment to finish. Open the exact URL GitHub shows there, typically `https://USERNAME.github.io/REPOSITORY/`.

The repository and static website can be public; your individual task data stays on each device. Do not commit exported task backups or private information. If you change the site's hostname/path, export first and import on the new address.

## Local development

Run in this folder:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. No installation/build step is needed. A current Chrome, Firefox, Edge, or Safari is recommended. Local file opening may behave differently for storage, so use a local server for development.

## Checks

```sh
node --check app.js
```

Automated tests use the Node built-in test runner and isolated validation and storage function harnesses. Run `node --test tests/app.test.cjs`. Browser QA should additionally exercise the visible UI, keyboard flow, light/dark layouts, and export/import.

## Verification

- Syntax checks passed for app and local server.
- Seven automated tests cover backup validation, invalid dates, malformed and oversized imports, duplicate IDs, save/reload, failed storage, and unreadable-data write protection.
- Browser checks passed for add, edit, reload persistence, completion, Completed view, search no-results, delete/undo, and light/dark appearance.
- File-picker import/export and mobile viewport behavior still need manual browser verification.
