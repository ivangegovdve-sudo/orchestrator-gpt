# Task: Life in Time — Deploy & Integrate

**Status:** Ready for execution  
**Priority:** High  
**Spawned from:** Claude conversation — SDforest dashboard  

---

## What this project is

A React/Vite single-page app that visualizes a user's remaining life as a grid of squares — weeks, months, summers, Christmases, or heartbeats. Children's remaining home time is overlaid in per-child colors. A side panel shows late-bloomer stories and skill peaks still ahead.

**Live URL (current):** `https://life-in-time-kqqzy3pgi-ivans-projects-1a79b2cd.vercel.app`  
**Target dashboard:** `https://www.sdforest.site`  
**Orchestrator repo:** `D:\Ivan\orchestrator-gpt\orchestrator-gpt`  
**App source:** `D:\Ivan\orchestrator-gpt\life-in-time`

---

## Agent tasks

| # | Agent | Task file | Status |
|---|-------|-----------|--------|
| 1 | `deploy-agent` | `TASK_1_deploy.md` | ⬜ pending |
| 2 | `dashboard-agent` | `TASK_2_dashboard.md` | ⬜ pending |
| 3 | `qa-agent` | `TASK_3_qa.md` | ⬜ pending |

---

## Execution order

```
TASK_1 (deploy-agent)
    └─► outputs: LIVE_URL
         └─► TASK_2 (dashboard-agent) reads LIVE_URL
              └─► outputs: updated index.html pushed to main
                   └─► TASK_3 (qa-agent) verifies both URLs live
```

---

## Completion criteria

- [ ] `life-in-time` app loads at a stable Vercel production URL
- [ ] SDforest dashboard card links to that URL and opens correctly
- [ ] `orchestrator-gpt` main branch reflects the update
- [ ] QA confirms no broken links or JS errors
