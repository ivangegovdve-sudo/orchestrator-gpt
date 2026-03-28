# TASK 3 — QA Agent

**Agent role:** `qa-agent`  
**Depends on:** TASK 1 + TASK 2 complete  
**Outputs:** `TASKS/life-in-time/OUTPUT_qa_report.md`

---

## Checks to perform

### 1. Read live URL

```python
with open("TASKS/life-in-time/OUTPUT_live_url.txt") as f:
    live_url = f.read().strip()
```

---

### 2. Check Vercel app is live

```python
import urllib.request

def check_url(url, label):
    try:
        req = urllib.request.urlopen(url, timeout=10)
        code = req.getcode()
        print(f"[{'OK' if code==200 else 'FAIL'}] {label}: HTTP {code}")
        return code == 200
    except Exception as e:
        print(f"[FAIL] {label}: {e}")
        return False

app_ok = check_url(live_url, "Life in Time app")
```

---

### 3. Check dashboard card URL is correct

```python
orch = r"D:\Ivan\orchestrator-gpt\orchestrator-gpt"
with open(orch + r"\index.html", encoding="utf-8") as f:
    html = f.read()

card_url_ok = live_url in html
print(f"[{'OK' if card_url_ok else 'FAIL'}] Dashboard card URL matches live URL")

# Also check no placeholder remains
placeholder_gone = "YOUR-LIFE-IN-TIME-URL" not in html
print(f"[{'OK' if placeholder_gone else 'FAIL'}] No placeholder URL in index.html")
```

---

### 4. Check dashboard itself loads

```python
dash_ok = check_url("https://www.sdforest.site", "SDforest dashboard")
```

---

### 5. Check git is up to date

```powershell
cd D:\Ivan\orchestrator-gpt\orchestrator-gpt
git fetch origin
$status = git status --short
if ($status) {
    Write-Host "[WARN] Uncommitted changes: $status"
} else {
    Write-Host "[OK] Repo is clean and up to date"
}
```

---

### 6. Write QA report

```python
import datetime

results = {
    "timestamp": datetime.datetime.now().isoformat(),
    "live_url": live_url,
    "app_live": app_ok,
    "card_url_correct": card_url_ok,
    "placeholder_gone": placeholder_gone,
    "dashboard_live": dash_ok,
}

report = f"""# QA Report — Life in Time
Generated: {results['timestamp']}

## Results

| Check | Status |
|-------|--------|
| App live at Vercel | {'✅' if results['app_live'] else '❌'} |
| Dashboard card URL correct | {'✅' if results['card_url_correct'] else '❌'} |
| No placeholder URL remaining | {'✅' if results['placeholder_gone'] else '❌'} |
| SDforest dashboard loads | {'✅' if results['dashboard_live'] else '❌'} |

## Live URL
`{results['live_url']}`

## Overall
{'✅ ALL CHECKS PASSED' if all(results[k] for k in ['app_live','card_url_correct','placeholder_gone','dashboard_live']) else '❌ SOME CHECKS FAILED — see above'}
"""

with open("TASKS/life-in-time/OUTPUT_qa_report.md", "w") as f:
    f.write(report)

print(report)
```

---

## Done when

- [ ] All 4 checks pass
- [ ] `OUTPUT_qa_report.md` written
- [ ] If any check fails: re-trigger the relevant task (TASK 1 for app issues, TASK 2 for dashboard issues)
