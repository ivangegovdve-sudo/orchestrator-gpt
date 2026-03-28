# TASK 2 — Dashboard Agent

**Agent role:** `dashboard-agent`  
**Depends on:** TASK 1 (`OUTPUT_live_url.txt` must exist)  
**Outputs:** updated `index.html` committed and pushed to `main`

---

## Context

The SDforest dashboard (`https://www.sdforest.site`) is served from:

```
D:\Ivan\orchestrator-gpt\orchestrator-gpt\index.html
```

A "Life in Time" card already exists in the file but may contain a placeholder or stale URL. This task ensures it points to the correct live production URL from TASK 1.

---

## Steps

### 1. Read the live URL from TASK 1

```python
with open("TASKS/life-in-time/OUTPUT_live_url.txt") as f:
    live_url = f.read().strip()
assert live_url.startswith("https://"), "Invalid URL"
print("Using:", live_url)
```

### 2. Update index.html

Run `setup.py` which handles HTML safely (avoids PowerShell angle-bracket issues):

```powershell
cd D:\Ivan\orchestrator-gpt\orchestrator-gpt

python setup.py --inject `
  --url (Get-Content TASKS\life-in-time\OUTPUT_live_url.txt).Trim() `
  --orch-path D:\Ivan\orchestrator-gpt\orchestrator-gpt
```

**OR** use Python directly:

```python
import re

orch = r"D:\Ivan\orchestrator-gpt\orchestrator-gpt"
idx  = orch + r"\index.html"

with open(idx, "r", encoding="utf-8") as f:
    html = f.read()

# If card exists with wrong URL — replace it
if "Life in Time" in html:
    # Replace any existing href on the Life in Time card
    html = re.sub(
        r'(<a href=")[^"]*(".*?Life in Time)',
        rf'\g<1>{live_url}\g<2>',
        html,
        flags=re.DOTALL
    )
    print("Updated existing card URL.")
else:
    # Insert new card before Retail AI placeholder
    card = f'''
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
      </a>'''
    html = html.replace(
        '<a href="#" class="tool-card">',
        card + '\n\n      <a href="#" class="tool-card">',
        1
    )
    print("Inserted new card.")

with open(idx, "w", encoding="utf-8") as f:
    f.write(html)

print("index.html saved.")
```

### 3. Verify the URL appears correctly

```python
with open(idx, "r", encoding="utf-8") as f:
    content = f.read()

assert live_url in content, "URL not found in index.html after update!"
print("Verified.")
```

### 4. Commit and push

```powershell
cd D:\Ivan\orchestrator-gpt\orchestrator-gpt
git add index.html
git commit -m "Update Life in Time card URL — $live_url"
git push origin main
```

---

## Card spec (for reference)

The card must match the existing dashboard card structure exactly:

```
class="tool-card"           ← anchor tag class
class="tool-card-body"      ← inner wrapper
class="tool-card-title"     ← title + pill
class="tool-pill"           ← "External" label
class="tool-card-subtitle"  ← description text
class="tool-card-meta"      ← meta tags row
class="tool-card-progress"  ← progress track
class="tool-card-progress-bar" style="width:100%"
class="tool-card-progress-text" ← "100% Complete"
```

External cards (href starting with https://) automatically get purple pill styling via CSS:
```css
.tool-card[href^="http"] .tool-pill { color: var(--purple); }
```

---

## Done when

- [ ] `index.html` contains the correct `live_url`
- [ ] Commit pushed to `origin/main`
- [ ] Signal TASK 3 to proceed
