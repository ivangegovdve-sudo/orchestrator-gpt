param(
    [string]$AppPath = "",
    [string]$OrchestratorPath = $PSScriptRoot
)

if (-not $AppPath) {
    $AppPath = Join-Path (Split-Path $PSScriptRoot -Parent) "life-in-time"
}

$resolvedOrchestratorPath = (Resolve-Path $OrchestratorPath).Path
if (-not (Test-Path $AppPath)) {
    Write-Host "App path not found: $AppPath" -ForegroundColor Red
    exit 1
}

$resolvedAppPath = (Resolve-Path $AppPath).Path

# Step 1: Run Python setup (creates all files)
Write-Host "[1/3] Running Python setup..." -ForegroundColor Cyan
python "$PSScriptRoot\setup.py" --setup --app-path $resolvedAppPath
if ($LASTEXITCODE -ne 0) { Write-Host "Setup failed." -ForegroundColor Red; exit 1 }

# Step 2: npm install + vercel deploy
Write-Host "[2/3] Installing and deploying..." -ForegroundColor Cyan
Set-Location $resolvedAppPath
npm install

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    npm install -g vercel
}

$rawOutput = vercel --yes 2>&1
$rawOutput | ForEach-Object { Write-Host $_ }

$liveUrl = $null
foreach ($line in $rawOutput) {
    if ($line -match "https://[a-z0-9\-]+\.vercel\.app") {
        $liveUrl = $Matches[0]
    }
}
if (-not $liveUrl) {
    $liveUrl = Read-Host "Paste your Vercel URL"
}
Write-Host "Live URL: $liveUrl" -ForegroundColor Green

vercel --prod --yes 2>&1 | Out-Null

# Step 3: Inject card + git push
Write-Host "[3/3] Updating dashboard and pushing..." -ForegroundColor Cyan
python "$PSScriptRoot\setup.py" --inject --url $liveUrl --orch-path $resolvedOrchestratorPath
if ($LASTEXITCODE -ne 0) { Write-Host "Inject failed." -ForegroundColor Red; exit 1 }

Set-Location $resolvedOrchestratorPath
git add index.html
git commit -m "Add Life in Time card -- $liveUrl"
git push

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
Write-Host "App : $liveUrl" -ForegroundColor Green
Write-Host "Hub : https://www.sdforest.site" -ForegroundColor Green
