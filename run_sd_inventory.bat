@echo off
REM -------------------------------------------------------------
REM Stable Diffusion Inventory - One-click launcher
REM Repo root: C:\Ivan\_StableDiffusion\orchestrator-gpt
REM -------------------------------------------------------------

setlocal

cd /d "C:\Ivan\_StableDiffusion\orchestrator-gpt"

echo [1/2] Running Stable Diffusion inventory Python script...

REM Prefer the Python launcher "py -3"; if that fails on my machine
REM I will manually change it to "python" or "py".
py -3 "scripts\sd_inventory\sd_inventory.py"
set RESULT=%ERRORLEVEL%

echo.
echo [2/2] Interpreting result...

if %RESULT%==0 (
  echo [RESULT] Stable Diffusion inventory completed successfully. See summary above.
) else (
  echo [RESULT] Stable Diffusion inventory finished with issues. See messages above.
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
