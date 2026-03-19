## 2026-03-11 - Adding standard focus-visible styles to simple JS apps
**Learning:** Native `button`, `input`, `textarea`, and `select` elements can easily lose clear focus states in vanilla CSS projects without a framework. Applying a global `:focus-visible` outline is a highly effective, low-effort micro-UX win for keyboard navigation.
**Action:** Always check basic keyboard tab navigation on custom interactive elements in vanilla JS projects and add a consistent `:focus-visible` outline if missing.
## 2024-03-13 - [Prompt Builder Form Accessibility]
**Learning:** Forms using custom `div.param-label` elements lose native accessibility and usability. Screen readers don't associate them with inputs, and users can't click them to focus the field.
**Action:** When identifying grouped input structures, aggressively convert custom div labels to `<label for="id">`. Ensure any CSS targeting the custom class (e.g. `display: block`) is ported or updated to maintain layout without regressing visual design.
