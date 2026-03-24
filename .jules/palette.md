## 2024-05-24 - Interactive Elements Missing Focus Outlines
**Learning:** Vanilla JS sub-projects in this repository often use custom styled buttons, inputs, selects, and textareas with explicit `outline: none;` without providing a fallback `:focus-visible` state. Clickable wrapper elements such as `.chip` may also need focus styles passed up from the focused input via selectors like `:has(input:focus-visible)`.
**Action:** When working on vanilla HTML/JS projects in `web/`, make sure `button`, `input`, `textarea`, and `select` have explicit `:focus-visible` styles that use the app's accent color and remain visible during keyboard navigation.

## 2026-03-11 - Adding standard focus-visible styles to simple JS apps
**Learning:** Native `button`, `input`, `textarea`, and `select` elements can easily lose clear focus states in vanilla CSS projects without a framework. Applying a global `:focus-visible` outline is a highly effective, low-effort micro-UX win for keyboard navigation.
**Action:** Always check basic keyboard tab navigation on custom interactive elements in vanilla JS projects and add a consistent `:focus-visible` outline if missing.

## 2026-03-13 - Prompt Builder Form Accessibility
**Learning:** Forms using custom `div.param-label` elements lose native accessibility and usability. Screen readers do not associate them with inputs, and users cannot click them to focus the field.
**Action:** When grouped input structures are identified, convert custom `div` labels to `<label for="id">` and preserve the intended layout in CSS so the accessibility fix does not regress the design.

## 2026-03-15 - Added Missing Dialog Confirmations for Destructive Actions in Shared Calendar
**Learning:** The shared calendar had destructive `Delete` and `Remove` actions without confirmation or undo, which made accidental data loss too easy.
**Action:** Add `window.confirm("Are you sure you want to remove this activity?")` checks before destructive actions, and look for similar `Delete` or `Remove` actions in other vanilla JS tools.

## 2024-10-24 - Semantic Labels in Vanilla Form Controls
**Learning:** Found a recurring pattern in vanilla HTML apps where non-semantic `div.label` elements were used to label inputs without being programmatically linked. This prevents screen readers from announcing the label when the input is focused, and stops users from clicking the label text to focus the input.
**Action:** When finding `div.label`, convert it to a semantic `<label class="label" for="inputId">` element. Update the `.label` CSS to use `display: block;` to ensure the layout remains visually identical while significantly improving accessibility.
