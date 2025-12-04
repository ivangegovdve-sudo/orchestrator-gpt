param()

# Unified Orchestrator CLI for Ivan

$RepoRoot = "C:\Ivan\_StableDiffusion\orchestrator-gpt"
$SDInventoryScript = Join-Path $RepoRoot "scripts\sd_inventory\sd_inventory.py"

function Pause-ForUser {
    Write-Host
    [void](Read-Host "Press Enter to continue...")
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]] $Args
    )

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: 'git' command not found. Is Git installed and on PATH?" -ForegroundColor Red
        return
    }

    Push-Location $RepoRoot
    try {
        Write-Host "Running: git $($Args -join ' ')" -ForegroundColor Cyan
        & git @Args
        if ($LASTEXITCODE -ne 0) {
            Write-Host "git exited with code $LASTEXITCODE" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "ERROR running git: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

function Invoke-SDInventory {
    Write-Host "Running Stable Diffusion inventory..." -ForegroundColor Cyan

    if (-not (Test-Path $SDInventoryScript)) {
        Write-Host "ERROR: Inventory script not found at: $SDInventoryScript" -ForegroundColor Red
        Pause-ForUser
        return
    }

    # Prefer 'py -3'; user can adjust if needed
    if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
        Write-Host "WARNING: 'py' launcher not found on PATH. Trying 'python' instead..." -ForegroundColor Yellow
        $pythonCmd = "python"
    }
    else {
        $pythonCmd = "py"
    }

    Push-Location $RepoRoot
    try {
        if ($pythonCmd -eq "py") {
            & $pythonCmd -3 $SDInventoryScript
        }
        else {
            & $pythonCmd $SDInventoryScript
        }
        $code = $LASTEXITCODE
        Write-Host "Stable Diffusion inventory process exit code: $code" -ForegroundColor Gray
    }
    catch {
        Write-Host "ERROR running SD inventory: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }

    Pause-ForUser
}

function Show-Menu {
    Clear-Host
    Write-Host "================ Orchestrator CLI ================"
    Write-Host "Repo: $RepoRoot"
    Write-Host ""
    Write-Host " 1) Git status"
    Write-Host " 2) Git pull"
    Write-Host " 3) Git push"
    Write-Host " 4) Run SD inventory"
    Write-Host " 5) Update repo (git pull) + run SD inventory"
    Write-Host " 0) Exit"
    Write-Host "=================================================="
    Write-Host
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select option"

    switch ($choice) {
        '1' {
            Write-Host
            Write-Host "=== Git status ===" -ForegroundColor Cyan
            Invoke-Git -Args @("status", "-sb")
            Pause-ForUser
        }
        '2' {
            Write-Host
            Write-Host "=== Git pull ===" -ForegroundColor Cyan
            Invoke-Git -Args @("pull")
            Pause-ForUser
        }
        '3' {
            Write-Host
            Write-Host "=== Git push ===" -ForegroundColor Cyan
            Invoke-Git -Args @("push")
            Pause-ForUser
        }
        '4' {
            Write-Host
            Write-Host "=== Run SD inventory ===" -ForegroundColor Cyan
            Invoke-SDInventory
        }
        '5' {
            Write-Host
            Write-Host "=== Git pull + SD inventory ===" -ForegroundColor Cyan
            Invoke-Git -Args @("pull")
            Invoke-SDInventory
        }
        '0' {
            Write-Host
            Write-Host "Exiting Orchestrator CLI..." -ForegroundColor Cyan
        }
        default {
            Write-Host
            Write-Host "Unknown option '$choice'. Please choose a valid menu number." -ForegroundColor Yellow
            Pause-ForUser
        }
    }
}
while ($choice -ne '0')
