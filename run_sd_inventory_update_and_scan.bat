@echo off
REM ----------------------------------------------------------------
REM Stable Diffusion Inventory - Update repo and run inventory
REM Repo root: C:\Ivan\_StableDiffusion\orchestrator-gpt
REM ----------------------------------------------------------------

setlocal

echo [1/3] Changing to repo root...
cd /d "C:\Ivan\_StableDiffusion\orchestrator-gpt"

echo [2/3] Pulling latest changes from Git...
git pull

echo.
echo [3/3] Running Stable Diffusion inventory launcher...
call "run_sd_inventory.bat"

echo.
echo All steps completed. You can review the messages above.
echo Press any key to close this window.
pause >nul

endlocal
