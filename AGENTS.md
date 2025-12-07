# AGENTS.md — AI Agent Guide for `orchestrator-gpt`

Think of this file as a README specifically for AI coding agents (Codex, Copilot, Cursor, etc.).
You are helping Ivan maintain a clean, safe, and ergonomic toolkit around Stable Diffusion —
**not** generating art.

The repository root in your environment is typically something like:

- `/workspace/orchestrator-gpt`

All paths mentioned below are **relative to the repository root**.

---

## 1. Project overview

This repo is the **control plane** for Ivan’s Stable Diffusion setup.

Goals:

- Provide small, reliable tools for:
  - Prompt building and presets.
  - Stable Diffusion model / LoRA / embedding inventory.
  - Startup automation (launch SD, Cloudflare tunnels, etc.).
  - Diagnostics and reports.
- Keep the Stable Diffusion installation itself **read-only** for AI agents.
- Avoid “mystery behavior” — every tool should be:
  - Single-purpose
  - Easy to inspect
  - Easy to recover from

---

## 2. Environment & external systems

### 2.1 Local environment assumptions

There are two major environments in play:

1. **This repo** (`orchestrator-gpt`), where you are allowed to work.
2. **The Stable Diffusion install**, which you **must not modify**:

   - Stable Diffusion install root (external, off-limits):

     ```text
     C:\Ivan\_StableDiffusion\stable-diffusion-webui\
     ```

   - Treat this as a **read-only external system**. You may read paths or filenames
     from reports, but you must not edit anything there.

### 2.2 Repo structure (high level)

Key directories:

- `index.html` — main hub page for the web UI.
- `web/` — per-tool web UIs (static HTML/JS, no build step).
- `data/` — JSON and other structured data (presets, inventories, reports).
- `assets/` — shared static assets for the web tools.
- `scripts/` — automation scripts (.bat, .ps1, Python, etc.) **(protected by default)**.
- `docs/` — docs and reference material **(protected by default)**.

---

## 3. Safety boundaries (VERY IMPORTANT)

### 3.1 Safe edit zones (default OK to modify)

Unless a task explicitly says otherwise, you may **create or modify** files only in:

- `index.html`
- `web/**`
- `data/**`
- `assets/**`

You may:
- Create new files in these directories.
- Edit existing files in these directories.
- Create subdirectories under them.

### 3.2 Protected zones (do not touch unless explicitly asked)

Do **not** create or modify files in these paths unless the user explicitly instructs
you for a specific task:

- `config/**`
- `scripts/**`
- `docs/**`
- `.vscode/**`
- Any dotfile at repo root (e.g. `.gitignore`) unless asked.
- Anything outside this repository (e.g. the SD install root path above).

If a task seems to require changes in these areas, you must:

1. Prefer changes in `data/` or `web/` instead (e.g. config JSON, UI behavior).
2. If absolutely necessary, clearly explain in your own reasoning and in the PR summary
   why a protected file needed to be changed.

### 3.3 Never touch the Stable Diffusion install

Repeating the critical rule:

> **Never create, delete, or modify files under the Stable Diffusion install root**  
> `C:\Ivan\_StableDiffusion\stable-diffusion-webui\`

This includes any subdirectory within it. Treat it as an external dependency
that is configured by a human or by separate scripts outside your control.

---

## 4. Git workflow expectations

You typically run in a cloud environment where:

- The repo root is `/workspace/orchestrator-gpt`.
- The current branch is often a working branch (e.g. `work`) created for the session.
- Your job is to:
  - Make the requested changes.
  - Stage the relevant files.
  - Commit them with a clear message.
  - Leave the PR creation / merge flow to the surrounding system.

Guidelines:

- **Do not change branches** unless explicitly requested.
- **Only stage and commit files that you actually changed** for the current task.
- Use clear, descriptive commit messages, for example:
  - `Add initial sd_inventory.json`
  - `Update prompt presets for JuniorTiles`
  - `Improve prompt builder web UI layout`

If you need to create a new file for a task, ensure the parent directory exists
(e.g. `mkdir -p data` before writing `data/sd_inventory.json`).

---

## 5. Commands, build, and testing

This repo is mostly **static HTML/JS and scripts**. There is no heavy build
pipeline by default.

### 5.1 Build

- **No build step required** for Vercel in production:
  - Root is `/`
  - Main entry: `index.html`
  - Tool entries: `/web/<tool>/index.html`

Do **not** add complex build tooling (Webpack, Vite, etc.) unless explicitly asked.

### 5.2 Testing / validation

Where possible:

- For **JSON files** (e.g. inventories, presets):
  - Ensure they are valid JSON and pretty-printed.
  - Use consistent indentation (2 or 4 spaces, but be consistent within a file).

- For **HTML/JS UIs**:
  - Open in a browser (locally or conceptually) and ensure:
    - No obvious console errors.
    - UI loads without external build steps.

If there are existing scripts like `run_sd_inventory.bat` or
`run_sd_inventory_update_and_scan.bat`:

- Do **not** modify these without explicit instruction.
- You may document them in comments or README text so humans know how to run them.

---

## 6. Task profiles (what to do depending on the request)

The human may refer to “agents” like **inventory agent**, **prompt preset agent**, etc.
Treat these as **task profiles** within this AGENTS.md file.

When the user’s request clearly matches one of these profiles, follow the rules
for that profile in addition to the global rules above.

### 6.1 Inventory tasks (“inventory agent”)

Purpose:

- Maintain a structured inventory of Stable Diffusion resources for this project:
  checkpoints, LoRAs, embeddings, ControlNet models, animation models, etc.

Primary files:

- `data/sd_inventory.json`
- Additional JSON files in `data/` such as:
  - `data/sd_inventory_*.json`
  - `data/StableDiffusion_Report_*.json` (if they exist)

Rules:

1. **Scope**
   - Create or update **only** the inventory-related JSON files in `data/`.
   - Do not modify `scripts/` or `web/` unless explicitly asked.

2. **Behavior**
   - Keep `data/sd_inventory.json` as the canonical machine-readable inventory.
   - Structure example:

     ```jsonc
     {
       "schema": "ivan-sd-inventory-v1",
       "checkpoints": [],
       "loras": [],
       "embeddings": [],
       "controlnet": [],
       "animatediff": []
     }
     ```

   - Use arrays of objects for each category (checkpoint, lora, embedding, etc.).
   - Use simple, stable keys such as:
     - `id`
     - `filename`
     - `categories`
     - `type`
     - `mode`
     - `notes`

3. **Naming & consistency**
   - `id` should be a short, stable identifier (no spaces if possible).
   - `filename` should match the actual file name in the SD install (case-sensitive).
   - If there is conflicting information, keep the JSON internally consistent and
     prefer the most recent, authoritative source (e.g. the latest SD report).

4. **Git**
   - Commit messages should clearly mention “inventory” or “sd_inventory”.

### 6.2 Prompt preset & prompt builder tasks (“prompt preset agent”)

Purpose:

- Manage prompt presets and configuration for the prompt builder web app.
- Keep preset JSONs and UI in sync.

Primary files:

- `data/presets/*.json`
- Preset example files (e.g. `data/newPresets.json`, etc.).
- Prompt builder web UI:
  - `web/prompt-builder/index.html`
  - `web/prompt-builder/*.js`
  - Or similar tool-specific directories.

Rules:

1. **Scope**
   - Modify only:
     - `data/presets/**`
     - `data/*.json` preset-related files
     - `web/prompt-builder/**`
   - Do not alter `scripts/**` or `config/**` for preset tasks.

2. **Behavior for presets**
   - Presets must be valid JSON.
   - Prefer a consistent structure, for example:

     ```jsonc
     {
       "schema": "ivan-prompt-presets-v1",
       "presets": [
         {
           "id": "junior_tiles_icon",
           "name": "JuniorTiles Icon Base",
           "model": "DreamShaper_8_pruned",
           "loras": ["fantasyV1.1", "CrystallineAI-000009"],
           "positive": "... prompt text ...",
           "negative": "... negative prompt text ...",
           "steps": 30,
           "cfg_scale": 7,
           "sampler": "DPM++ 2M Karras",
           "size": "512x512"
         }
       ]
     }
     ```

   - Keep fields descriptive but minimal and machine-readable.
   - When in doubt, favor **explicit fields** instead of overloaded free-text.

3. **Prompt builder UI behavior**
   - The prompt builder must:
     - Load preset JSONs dynamically from `/data/presets/` (or a configured list).
     - Allow selection of model / LoRA based on entries in `data/sd_inventory.json`.
     - Support dynamic token syntax like `{optionA|optionB|optionC}` for variation.
     - Expose batch size / variation parameters clearly.

4. **Do not call Stable Diffusion APIs by default**
   - The default mode is: build prompts and export metadata only.
   - If adding an “A1111 API mode”:
     - It should be **off by default**.
     - Use a clear toggle or configuration.

### 6.3 Automation & startup tasks (“startup automation agent”)

Purpose:

- Design or adjust startup scripts that:
  - Launch Stable Diffusion.
  - Check VPN/IP/firewall status.
  - Run Cloudflare tunnels.
  - Start any local HTTP servers for this repo.

Primary files (protected by default):

- `scripts/*.ps1`
- `scripts/*.bat`
- `orchestrator_cli.bat`
- `orchestrator_git_menu.ps1`
- `orchestrator_http_server.py`

Rules:

1. **Scope**
   - **Do not modify these files unless the user explicitly asks for automation changes.**
   - If asked to modify, keep changes minimal and well-commented.

2. **Behavior**
   - Scripts should:
     - Start Stable Diffusion reliably.
     - Perform simple, explicit checks (e.g. “is Cloudflare tunnel running?”).
     - Print clear reasons when something fails and show next steps.

3. **Philosophy**
   - Avoid overly clever logic.
   - Prefer readable batch/PowerShell over magic.
   - Document expectations and assumptions in comments.

### 6.4 Diagnostics tasks (“diagnostics agent”)

Purpose:

- Confirm assumptions about the environment or repo structure by creating small,
  observable probes.

Typical outputs:

- `scratch/diagnostics_*.txt`
- `scratch/diagnostics_*.md`
- `scratch/*.html` or simple JS/HTML probes under `scratch/`

Rules:

1. **Scope**
   - You may create files under:
     - `scratch/**`
     - `data/**` (for structured probes)
   - Do not modify production tools unless the user explicitly wants a permanent probe.

2. **Behavior**
   - Probes should be:
     - Small and self-contained.
     - Easy to delete once the question is answered.
   - Examples:
     - A text file summarizing discovered inventory.
     - A tiny HTML file that prints detected paths or states.
     - A JSON snapshot of parsed SD reports.

3. **Git**
   - If probes are meant to be temporary, either:
     - Do **not** commit them, or
     - Group them under a clearly named commit like:
       - `Add diagnostics scratch files for SD inventory`

### 6.5 Web tool / UI tasks (“UI agent”)

Purpose:

- Create or refine small, static web tools under `web/` and `index.html`.

Rules:

1. **Scope**
   - Only modify:
     - `index.html`
     - `web/**`
     - `assets/**`
     - `data/**` (for config/data the UI consumes)

2. **Behavior**
   - Use simple static HTML/JS (no build tooling).
   - Keep design:
     - Clean and minimal.
     - Clear layout and labels.
   - Prefer:
     - Plain JS modules over heavy frameworks.
     - Fetching JSON from `/data/**` instead of hardcoding large data blobs.

3. **Integration with data**
   - Web tools should read from the canonical JSON sources:
     - `data/sd_inventory.json` for models/LoRAs/embeddings.
     - `data/presets/**` for presets.
   - Avoid scanning the Stable Diffusion install directly; rely on JSON.

---

## 7. How to interpret user instructions

When interacting with the human:

- If they say “use inventory agent”:
  - Apply the rules in **6.1 Inventory tasks** plus global rules.
- If they say “use prompt preset agent” or “prompt builder work”:
  - Apply **6.2 Prompt preset & prompt builder tasks** plus global rules.
- If they mention startup scripts, Cloudflare, VPN, or `.bat`/`.ps1`:
  - Apply **6.3 Automation & startup tasks** and treat `scripts/**` as modifiable
    only for that task.
- If they mention “probe”, “diagnostic”, “check assumptions”:
  - Apply **6.4 Diagnostics tasks** and prefer `scratch/**`.
- If they mention UI, web tool, “prompt builder page”, or `index.html`:
  - Apply **6.5 Web tool / UI tasks**.

When in doubt:

- Prefer **narrow, reversible changes** in safe edit zones.
- Prefer **JSON + static HTML** over new frameworks or build tooling.
- Do **not** modify the Stable Diffusion install or protected directories unless
  explicitly asked and clearly needed.

---

## 8. Summary for agents

- Work **inside this repo only**.
- Use **relative paths** (no leading slashes).
- Treat:
  - `data/**`, `web/**`, `assets/**`, `index.html` as safe.
  - `config/**`, `scripts/**`, `docs/**`, `.vscode/**` as protected.
  - `C:\Ivan\_StableDiffusion\stable-diffusion-webui\` as off-limits.
- Keep JSON structured, consistent, and pretty-printed.
- Favor small, understandable tools and scripts over large refactors.
- Make every change something Ivan can quickly understand and tweak by hand.

