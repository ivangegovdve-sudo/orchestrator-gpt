# TASK 1 — Deploy Agent

**Agent role:** `deploy-agent`  
**Depends on:** nothing  
**Outputs:** `LIVE_URL` written to `TASKS/life-in-time/OUTPUT_live_url.txt`

---

## Context

The `life-in-time` React/Vite project already exists at:

```
D:\Ivan\orchestrator-gpt\life-in-time\
  package.json
  vite.config.js
  index.html
  src\
    main.jsx
    App.jsx        ← NEEDS REPLACING with latest version
```

The app was previously deployed to Vercel but `App.jsx` needs to be updated to the latest redesigned version before redeployment.

---

## Source file: App.jsx

The latest `App.jsx` is in the Claude conversation artifact titled  
**`src/App.jsx — full redesign`**  
or available in `TASKS/life-in-time/App.jsx` (copy it there before running).

Key changes in the new version:
- Full viewport layout (100vh/100vw)
- Future-only grid — starts from today, no past shown
- Responsive cell size calculated from window width
- Per-child colors (amber, emerald, rose, violet, sky)
- Sidebar with age/year labels
- "What's Still Possible" hope panel with late-bloomer stories

---

## Steps

### 1. Replace App.jsx

```powershell
# Copy the new App.jsx into place
Copy-Item "TASKS\life-in-time\App.jsx" `
          "D:\Ivan\orchestrator-gpt\life-in-time\src\App.jsx" -Force
```

### 2. Verify dependencies are installed

```powershell
cd D:\Ivan\orchestrator-gpt\life-in-time
if (-not (Test-Path "node_modules")) { npm install }
```

### 3. Login check

```powershell
vercel whoami
# If error: run `vercel login` and complete browser auth
```

### 4. Deploy to production

```powershell
cd D:\Ivan\orchestrator-gpt\life-in-time
vercel --prod --yes 2>&1 | Tee-Object -FilePath "deploy_output.txt"
```

### 5. Extract and save live URL

```powershell
$url = (Get-Content "deploy_output.txt" |
        Select-String "https://[a-z0-9\-]+\.vercel\.app" |
        ForEach-Object { $_.Matches[0].Value } |
        Select-Object -Last 1)

Set-Content "D:\Ivan\orchestrator-gpt\orchestrator-gpt\TASKS\life-in-time\OUTPUT_live_url.txt" $url
Write-Host "Saved: $url"
```

---

## Expected output

File created: `TASKS/life-in-time/OUTPUT_live_url.txt`  
Contents: one line, e.g. `https://life-in-time-xxxx.vercel.app`

---

## Error handling

| Error | Fix |
|-------|-----|
| `token is not valid` | Run `vercel login` |
| `npm ERR!` | Delete `node_modules`, re-run `npm install` |
| No URL in output | Check `deploy_output.txt`, copy URL manually |
| Build fails | Check `src/App.jsx` was saved correctly (not empty) |

---

## Done when

- [ ] App loads at production Vercel URL
- [ ] `OUTPUT_live_url.txt` exists and contains a valid `https://` URL
- [ ] Signal TASK 2 to proceed
