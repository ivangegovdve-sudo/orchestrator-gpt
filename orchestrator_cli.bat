@echo off
REM -------------------------------------------------------------
REM Orchestrator CLI launcher (Windows batch)
REM Repo root: C:\Ivan\_StableDiffusion\orchestrator-gpt
REM -------------------------------------------------------------

setlocal

cd /d "C:\Ivan\_StableDiffusion\orchestrator-gpt"

REM Launch the PowerShell menu with a relaxed policy for this script only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0orchestrator_git_menu.ps1"

endlocal
