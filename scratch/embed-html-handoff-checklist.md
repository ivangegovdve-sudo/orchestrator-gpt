# Embed Another HTML Tool in Orchestrator GPT (Codex Handoff Checklist)

- **Goal statement to give Codex:**
  - "Add a new static web tool to this repo and expose it from the main hub as a clickable tile, similar to `/web/shared-calendar/`."

- **Repo + scope constraints Codex must follow:**
  - "Work only inside this repo: `/workspace/orchestrator-gpt`."
  - "Allowed edit zones: `index.html`, `web/**`, `data/**`, `assets/**`, `scratch/**`."
  - "Do not edit protected paths (`docs/**`, `scripts/**`, `config/**`, `.vscode/**`) unless explicitly asked."
  - "Do not touch external SD install paths."

- **Required implementation pattern (same style as calendar tool):**
  - "Create a folder for the new tool under `web/<tool-slug>/`."
  - "Place entry file at `web/<tool-slug>/index.html`."
  - "Keep it static HTML/CSS/JS (no build system, no framework setup)."
  - "Use relative/static asset loading that works under repo hosting paths."

- **URL routing conventions to request explicitly:**
  - "New tool URL should be accessible at `/web/<tool-slug>/`."
  - "Hub link should point to `/web/<tool-slug>/` (trailing slash preferred)."
  - "Do not require backend routes for this."

- **Hub integration steps Codex must perform:**
  - "Add a new tile/card in `index.html` inside the existing tool grid."
  - "Card should include title, short description, and link metadata line."
  - "Use existing hub card classes so visual style stays consistent."

- **If embedding an existing standalone HTML file you already have:**
  - "Copy/adapt that HTML into `web/<tool-slug>/index.html`."
  - "If it references other files (CSS/JS/images), place them under the same `web/<tool-slug>/` folder or under `assets/**` and update paths."
  - "Replace absolute local file paths with web-safe relative paths."
  - "Remove dependencies on local machine-only paths."

- **If you need an iframe-style embed instead of direct page copy:**
  - "Create `web/<tool-slug>/index.html` wrapper page containing an `<iframe>`."
  - "Set iframe `src` to a web URL reachable from deployed site (not local disk path)."
  - "Add responsive container styles and mobile-safe viewport behavior."
  - "Confirm target page allows framing (`X-Frame-Options` / `CSP frame-ancestors` must permit it)."

- **Deployment compatibility requirements:**
  - "No build step required; must run as plain static files."
  - "Entry points must remain `index.html` at root and `/web/<tool>/index.html` for tools."
  - "Avoid introducing Webpack/Vite/Node tooling unless explicitly requested."

- **Data/state requirements (for local-first tools):**
  - "If persistence is needed, use browser `localStorage` with a clear unique key."
  - "Keep data schema simple and versionable if likely to evolve."
  - "No auth/user accounts by default unless requested."

- **Mobile + UX acceptance checklist Codex should satisfy:**
  - "Tool is usable at mobile width (~390px)."
  - "Primary actions/buttons are visible and tap-friendly."
  - "No console errors on load."
  - "Page loads directly from `/web/<tool-slug>/` without extra setup."

- **Validation commands to request from Codex:**
  - "Run `python -m http.server 8000` from repo root and load the tool URL."
  - "Capture a screenshot of the new UI if it is a visible frontend change."
  - "Report exact commands executed and outcomes."

- **Git/PR requirements you can copy-paste into prompt:**
  - "Commit only files changed for this task."
  - "Use a clear commit message like: `Add <tool-name> web tool and hub link`."
  - "Create a PR with summary + testing notes after commit."

- **Exact prompt template you can give a new Codex chat:**
  - "Add a new static tool in `web/<tool-slug>/index.html` and link it from `index.html` in the tool grid, same integration pattern as `/web/shared-calendar/`. Keep changes only in allowed zones (`index.html`, `web/**`, `assets/**`, `data/**`, `scratch/**`), no build tooling, and ensure deployed URL works at `/web/<tool-slug>/`. If the tool is visual, run a local static server and include one screenshot. Commit your changes and open a PR with a concise summary and test commands."

- **Common failure points to warn Codex about:**
  - "Broken links from missing leading slash or wrong relative path depth."
  - "Assets referenced from local disk (`C:\...`) instead of repo paths."
  - "Using protected directories for UI work."
  - "Adding non-static dependencies that break deployment expectations."
  - "For iframe embeds: target site blocking iframe embedding by policy headers."
