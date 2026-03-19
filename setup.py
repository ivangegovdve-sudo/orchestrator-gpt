"""
setup.py
Handles file creation and HTML injection for the Life in Time deploy.
Called by deploy.ps1 — do not run directly unless you know the args.
"""

import argparse
import os
import sys

# ── File contents ─────────────────────────────────────────────────────────────

PACKAGE_JSON = '''{
  "name": "life-in-time",
  "version": "1.0.0",
  "private": true,
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "@vitejs/plugin-react": "^4.3.1", "vite": "^5.4.2" }
}
'''

VITE_CONFIG = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
"""

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Life in Time</title>
    <meta name="description" content="How many summers do you have left?" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"""

MAIN_JSX = """import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
)
"""

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  wrote: {path}")

# ── --setup: create project skeleton ─────────────────────────────────────────

def do_setup(app_path):
    print("[setup] Creating project files...")
    write(os.path.join(app_path, "package.json"),   PACKAGE_JSON)
    write(os.path.join(app_path, "vite.config.js"), VITE_CONFIG)
    write(os.path.join(app_path, "index.html"),     INDEX_HTML)
    write(os.path.join(app_path, "src", "main.jsx"), MAIN_JSX)

    app_jsx = os.path.join(app_path, "src", "App.jsx")
    if not os.path.exists(app_jsx) or os.path.getsize(app_jsx) < 100:
        write(app_jsx, "")
        print()
        print("  ACTION NEEDED: Open this file and paste the App.jsx content from Claude:")
        print(f"  {app_jsx}")
        print()
        # Open in notepad and wait
        import subprocess
        proc = subprocess.Popen(["notepad", app_jsx])
        input("  Press Enter once you have saved and closed Notepad... ")
        proc.wait()

        if os.path.getsize(app_jsx) < 100:
            print("ERROR: App.jsx is still empty.")
            sys.exit(1)

    print("[setup] Done.")

# ── --inject: insert card into orchestrator index.html ───────────────────────

def do_inject(live_url, orch_path):
    index_path = os.path.join(orch_path, "index.html")
    if not os.path.exists(index_path):
        print(f"ERROR: {index_path} not found.")
        sys.exit(1)

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    if "Life in Time" in html:
        print("[inject] Card already present — skipping.")
        return

    card = f"""
      <!-- Life in Time -->
      <a href="{live_url}" target="_blank" rel="noopener noreferrer" class="tool-card">
        <div class="tool-card-body">
          <div class="tool-card-title">
            Life in Time
            <span class="tool-pill">External</span>
          </div>
          <div class="tool-card-subtitle">
            Visualize your entire life in weeks, heartbeats, summers, and Christmases
            and how much time remains with your children before they grow up.
          </div>
          <div class="tool-card-meta">
            <span>React / Vite</span>
            <span>Vercel</span>
          </div>
          <div class="tool-card-progress">
            <div class="tool-card-progress-bar" style="width: 100%;"></div>
          </div>
          <div class="tool-card-progress-text">100% Complete</div>
        </div>
      </a>"""

    # Insert before the first 0% / placeholder card (Retail AI)
    retail_marker = '<a href="#" class="tool-card">'
    if retail_marker in html:
        html = html.replace(retail_marker, card + "\n\n      " + retail_marker, 1)
        print("[inject] Card inserted before Retail AI card.")
    else:
        # Fallback: before closing tool-grid div
        grid_close = "    </div>\n  </div>"
        if grid_close in html:
            html = html.replace(grid_close, card + "\n" + grid_close, 1)
            print("[inject] Card inserted via fallback.")
        else:
            print("WARNING: Could not find insertion point. Appending before </body>.")
            html = html.replace("</body>", card + "\n</body>")

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[inject] {index_path} updated.")

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--setup",      action="store_true")
    parser.add_argument("--inject",     action="store_true")
    parser.add_argument("--app-path",   default="")
    parser.add_argument("--url",        default="")
    parser.add_argument("--orch-path",  default="")
    args = parser.parse_args()

    if args.setup:
        if not args.app_path:
            print("ERROR: --app-path required with --setup"); sys.exit(1)
        do_setup(args.app_path)

    if args.inject:
        if not args.url or not args.orch_path:
            print("ERROR: --url and --orch-path required with --inject"); sys.exit(1)
        do_inject(args.url, args.orch_path)