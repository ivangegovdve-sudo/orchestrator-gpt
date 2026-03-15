## 2026-03-11 - Adding standard focus-visible styles to simple JS apps
**Learning:** Native `button`, `input`, `textarea`, and `select` elements can easily lose clear focus states in vanilla CSS projects without a framework. Applying a global `:focus-visible` outline is a highly effective, low-effort micro-UX win for keyboard navigation.
**Action:** Always check basic keyboard tab navigation on custom interactive elements in vanilla JS projects and add a consistent `:focus-visible` outline if missing.

## 2026-03-15 - [Added missing dialog confirmations for destructive actions in shared calendar]
**Learning:** Found an unprotected destructive delete action in `web/shared-calendar/index.html`. Users could easily click "Delete" or "Remove" to delete data without any confirmation or way to undo. This was surprisingly poorly handled before.
**Action:** Adding `window.confirm("Are you sure you want to remove this activity?")` checks. In the future, look for buttons labeled 'Delete' or 'Remove' and ensure they have confirmation dialogs attached before carrying out destructive operations.
