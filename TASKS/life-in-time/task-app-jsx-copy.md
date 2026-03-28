# Life in Time — Agent Task Bundle

Place this entire folder at:
```
D:\Ivan\orchestrator-gpt\orchestrator-gpt\TASKS\life-in-time\
```

---

## Files in this bundle

| File | Purpose |
|------|---------|
| `OVERVIEW.md` | Master task description and execution order |
| `TASK_1_deploy.md` | Deploy agent — build + push to Vercel |
| `TASK_2_dashboard.md` | Dashboard agent — update index.html + git push |
| `TASK_3_qa.md` | QA agent — verify both URLs and repo state |
| `App.jsx` | Latest React source — **copy this to `life-in-time/src/App.jsx`** |
| `OUTPUT_live_url.txt` | Created by TASK 1, read by TASK 2 + TASK 3 |
| `OUTPUT_qa_report.md` | Created by TASK 3 |

---

## Quickstart for an agent picking this up cold

1. Read `OVERVIEW.md` for full context
2. Confirm `App.jsx` is present in this folder
3. Execute TASK 1 → TASK 2 → TASK 3 in order
4. Each task writes its output before the next task reads it

---

## Key paths

```
App source      : D:\Ivan\orchestrator-gpt\life-in-time\
Dashboard repo  : D:\Ivan\orchestrator-gpt\orchestrator-gpt\
Dashboard file  : D:\Ivan\orchestrator-gpt\orchestrator-gpt\index.html
Live site       : https://www.sdforest.site
Vercel project  : life-in-time
```

---

## Notes for agents

- **Never edit HTML in PowerShell strings** — PowerShell treats `<` as a redirection operator. Always use Python for any HTML file manipulation.
- The `setup.py` in the repo root can be used for injection: `python setup.py --inject --url <URL> --orch-path <path>`
- Vercel CLI must be authenticated: run `vercel whoami` to check, `vercel login` if not.
- The dashboard auto-deploys on `git push` to `main` — no manual Vercel step needed for the dashboard itself.
