# Codex Bridge Toolkit

This toolkit provides a reusable AutoHotkey workflow for running Codex prompt chains defined in JSON. It replaces one-off 5-step automation scripts with a configurable bridge that can drive Codex for many different chains.

## Files

- `scripts/codex_bridge/codex_chains.json` — configuration file that lists available chains and their steps.
- `scripts/codex_bridge/codex_chain_runner.ahk` — AutoHotkey v1 script with GUI that loads the JSON and runs the selected chain.
- Step prompt files live in `codex_prompts/` (or another directory you specify in the JSON).

## Adding a new chain

1. Create prompt step files (plain text) under `codex_prompts/` (or your chosen folder). Name them clearly, such as `codex_step_A.txt`, `codex_step_B.html.txt`, etc.
2. Edit `scripts/codex_bridge/codex_chains.json` and add a new object under `chains`:
   - `id`: short internal id (e.g., `prompt_builder_v6`).
   - `name`: human-readable name for the GUI.
   - `description`: what the chain produces.
   - `step_files_dir`: absolute path to the folder containing the step files.
   - `idle_threshold_ms`: default idle time per step (optional; falls back to `default_idle_threshold_ms`).
   - `steps`: array of step objects with `index`, `file`, `expect_marker`, and optional per-step `idle_threshold_ms`.
3. Save the JSON. The AHK script will read the updated configuration the next time it is launched.

## Running a chain

1. Open Codex chat and click the input box so it is focused.
2. Run `scripts/codex_bridge/codex_chain_runner.ahk` (AutoHotkey v1).
3. In the GUI:
   - Pick a chain from the dropdown.
   - Press **Start** (or use hotkey `Ctrl+Alt+P`).
   - The script will copy each prompt, paste it into Codex, send Enter, and monitor output until it is idle.
   - Expected markers are checked automatically; success advances to the next step.
4. You can pause or reset at any time with the buttons or hotkeys (`Ctrl+Alt+R` to reset).

## Troubleshooting

- **Missing prompt file**: The GUI shows an error and pauses. Ensure the file exists at the `step_files_dir` path listed in the JSON.
- **Marker not found**: A dialog offers to retry monitoring, advance anyway, or pause. If the output looks correct but uses a different marker, update the `expect_marker` in the JSON.
- **Adjust idle timing**: Increase or decrease `idle_threshold_ms` (either globally in `default_idle_threshold_ms`, per chain, or per step) if Codex responses are slower or faster than expected.
- **Clipboard issues**: The automation relies on the clipboard. Close apps that interfere with clipboard monitoring if steps do not advance.
