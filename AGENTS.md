# AGENTS.md — AI Agent Guide for `orchestrator-gpt`

This document defines the rules and responsibilities for AI coding agents
(Codex, Copilot, Cursor, Orchestrator agents, etc.) operating inside the
`orchestrator-gpt` repository.

The repository acts as the **control plane for Ivan's SDforest ecosystem**.

Agents must treat this repository as the **central hub that monitors and
integrates multiple side projects**.

---

# 1. Project overview

This repository powers the **SDforest project hub**.

Main site:

https://www.sdforest.site/

SDforest is a personal dashboard that integrates multiple experimental
repositories and tools.

The orchestrator repository performs the following functions:

• monitors local repositories  
• generates project pages  
• updates dashboard metadata  
• produces repository health reports  
• consolidates datasets across projects  
• prevents duplicated data  

This repository is **not a Stable Diffusion tool anymore**.

It is a **project orchestration system**.

---

# 2. Repository layout

Typical local workspace root:


C:\Ivan_StableDiffusion\


Repositories present in the workspace:


orchestrator-gpt
gptAgent
python-learning-orchestrated
vfxportfolio-ee820969
retailAI
CursorAI
docsAI
LinearAI


The orchestrator repo acts as the **integration hub**.

---

# 3. Monitored repositories

The orchestrator must monitor the following repositories.

### SDforest hub

Repo: ivangegovdve-sudo/orchestrator-gpt  
Local path: C:\Ivan\_StableDiffusion\orchestrator-gpt  
Role: orchestration hub and SDforest dashboard

### AI tools

Repo: ivangegovdve-sudo/gptAgent  
Local path: C:\Ivan\_StableDiffusion\gptAgent  
Role: AI tool experiments

Repo: ivangegovdve-sudo/CursorAI  
Local path: C:\Ivan\_StableDiffusion\CursorAI  
Role: AI tooling research

Repo: ivangegovdve-sudo/LinearAI  
Local path: C:\Ivan\_StableDiffusion\LinearAI  
Role: automation experiments

### AI projects

Repo: ivangegovdve-sudo/retailAI  
Local path: C:\Ivan\_StableDiffusion\retailAI  
Role: AI application experiment

### Learning

Repo: ivangegovdve-sudo/python-learning-orchestrated  
Local path: C:\Ivan\_StableDiffusion\python-learning-orchestrated  
Role: education and learning experiments

### Documentation

Repo: ivangegovdve-sudo/docsAI  
Local path: C:\Ivan\_StableDiffusion\docsAI  
Role: knowledge base

### Creative

Repo: ivangegovdve-sudo/vfxportfolio-ee820969  
Local path: C:\Ivan\_StableDiffusion\vfxportfolio-ee820969  
Role: creative portfolio

---

# 4. Repository structure

Within `orchestrator-gpt` the expected structure is:


site/
dashboard/
projects/

data/
movies/
abbreviations/
tools/

scripts/
orchestrator.py

orchestrator-config/
repos.json

reports/
scratch/
assets/
web/


---

# 5. Agent roles

Agents working in this repository operate under specific roles.

---

## Orchestrator agent

Responsible for:

• scanning repositories  
• generating project pages  
• updating dashboard metadata  
• generating health reports  

Primary script:


scripts/orchestrator.py


Main tasks:


scan repositories
update site/projects/
update site/dashboard/projects.json
generate reports/repo-health.md


---

## UI agent

Responsible for the SDforest website.

Editable locations:


index.html
site/dashboard/
site/projects/
web/
assets/


Responsibilities:

• maintain dashboard layout  
• generate project cards  
• keep navigation consistent  
• integrate data search tools  

No build frameworks should be added unless explicitly requested.

Static HTML + JS only.

---

## Data agent

Responsible for structured datasets.

Example datasets:


movies library
abbreviations database
AI tools database
documentation datasets


Primary directory:


data/


The data agent must:

• maintain clean JSON schemas  
• verify dataset integrity  
• avoid duplicate data  

---

## Repo Monitor agent

Responsible for monitoring project repositories.

Tasks:

• detect new repositories  
• track repository activity  
• verify repository health  
• update dashboard metadata  

Reports generated:


reports/repo-health.md


---

# 6. Automatic repository discovery

The orchestrator may automatically discover new repositories.

Discovery location:


C:\Ivan_StableDiffusion\


Discovery rules:

A repository is valid if it contains:


.git
README.md


When discovered:

1. generate metadata entry
2. suggest dashboard integration
3. do NOT integrate automatically without confirmation

Suggested metadata structure:


{
"project": "example-project",
"local_path": "C:\Ivan\_StableDiffusion\example-project",
"type": "experiment"
}


---

# 7. SDforest site generation rules

The orchestrator automatically generates dashboard content.

Project pages are created here:


site/projects/{project}.md


Dashboard metadata file:


site/dashboard/projects.json


Each project must generate a dashboard card containing:

• project name  
• description  
• GitHub link  
• local path  
• project type  

---

# 8. Dashboard sections

Projects should be categorized into sections.

Example sections:


AI Tools
AI Experiments
Creative
Learning
Documentation
Automation
Data Libraries


The UI agent should automatically place project cards
into their corresponding sections.

---

# 9. Dataset integration

Some repositories contain structured data.

Examples:


movie library
abbreviations database
tool indexes
documentation collections


These may be integrated into:


data/


Possible directories:


data/movies/
data/abbreviations/
data/tools/


---

# 10. Strict dataset deduplication rules

Before copying any dataset the agent must check:

• duplicate filenames  
• duplicate dataset IDs  
• identical dataset hashes  
• overlapping content  

If duplicates exist:

1. create report


reports/duplication-report.md


2. request human approval

Datasets must **never be overwritten automatically**.

---

# 11. Repository health monitoring

The orchestrator must periodically check:

• last commit date  
• missing README files  
• broken dependencies  
• outdated documentation  

Output report:


reports/repo-health.md


---

# 12. Safety rules

Agents must follow strict safety boundaries.

Allowed modifications:


site/
web/
data/
assets/
scratch/


Protected locations:


scripts/
docs/
config/
.vscode/


Protected locations must not be modified unless explicitly requested.

---

# 13. Git workflow rules

Agents must:

• commit only files relevant to the task  
• avoid rewriting large datasets  
• produce small understandable commits  

Example commit messages:


Generate SDforest project pages
Update dashboard metadata
Add dataset duplication report


---

# 14. Diagnostics tasks

Temporary diagnostics may be written to:


scratch/


Examples:


scratch/repo-scan-report.md
scratch/dataset-scan.json


Temporary diagnostics should be easy to delete.

---

# 15. Summary for agents

This repository is the **orchestration system for the SDforest ecosystem**.

Agents must focus on:

• repository monitoring  
• project page generation  
• dashboard updates  
• dataset integrity  
• system clarity  

Agents should avoid complex frameworks and prioritize:

• simple automation  
• static web tools  
• transparent behavior  
• easy human maintenance