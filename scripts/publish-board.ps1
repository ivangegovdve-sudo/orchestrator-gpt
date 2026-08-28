<#
.SYNOPSIS
    Publishes the fleet coordination board to sdforest.site.

.DESCRIPTION
    Called from reconcile.ps1's publish step, immediately after it writes the local board.
    Force-pushes board.html and state.json to an orphan branch of the site repo, which
    api/board.js proxies to https://sdforest.site/web/board/.

    WHY AN ORPHAN BRANCH
    --------------------
    Every push to `main` is a production deploy. The board regenerates every ~15 minutes,
    so committing it to main would mean ~96 deploys a day to publish a file the site build
    does not even read. The orphan branch carries the two snapshot files and nothing else;
    vercel.json excludes it from deployment, so publishing never rebuilds the site.

    It is also force-pushed to a single fresh commit every time rather than appended to. A
    15-minute cadence would otherwise add ~35,000 commits a year, each holding a 45 KB
    file, to a repository nobody wants to clone twice.

    WHY THE SCAN IS A GATE AND NOT A REVIEW
    ---------------------------------------
    This branch is public, and it is written by an automated job on a 15-minute timer with
    no human in the loop. The board's content is assembled from PR titles, task text and
    session metadata, so what it contains changes without anyone deciding that it should.
    A scan that ran once when this was set up would prove nothing about the snapshot being
    pushed six weeks from now. It therefore runs on every publish and REFUSES rather than
    warning: a publisher that reports a problem and uploads anyway has not prevented it.

    The snapshot commit contains exactly three files: the two board files below, plus a
    README.md written here so anyone landing on the branch knows what it is and that its
    history is rewritten. Nothing else is ever published — claims.jsonl, pr-cache.json
    and jules-cache.json stay local, the first because it carries session paths and branch
    names, the other two because they are large caches of every PR title on the machine.

.PARAMETER BoardDir
    Where reconcile.ps1 writes. Defaults to D:\output\board.

.PARAMETER RepoDir
    Working copy of the site repo. Defaults to D:\projects\orchestrator-gpt.

.PARAMETER WhatIf
    Run every check and report, but do not push.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$BoardDir = 'D:\output\board',
    [string]$RepoDir  = 'D:\projects\orchestrator-gpt'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# A CONSTANT, not a parameter. This script force-pushes an orphan commit containing three
# files; pointed at `main` it would replace the site with them. Nothing needs to vary the
# destination, and a parameter that only ever holds one correct value is a loaded gun with
# a safety catch made of convention. vercel.json disables deployment for this exact name,
# which is a second reason it must not be caller-supplied: any other branch would still be
# force-pushed AND would trigger a build.
$Branch = 'board-live'

# The allowlist. Adding to it means deciding to make something public, which is why it is a
# literal list here rather than a directory copy with exclusions — an exclusion list fails
# open when a new file appears, and this one fails closed.
$PUBLISH = @(
    @{ Name = 'board.html'; Required = $true  },
    @{ Name = 'state.json'; Required = $true  }
)

# Patterns that must never reach a public branch. Deliberately broader than "real" secrets:
# a false positive costs one skipped publish and a log line, a false negative is permanent
# and public. Known-benign shapes are excluded below rather than by loosening these.
$SECRET_PATTERNS = @(
    @{ Name = 'OpenAI-style key';   Pattern = 'sk-[A-Za-z0-9]{20,}' },
    @{ Name = 'GitHub PAT';         Pattern = '(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}' },
    @{ Name = 'GitHub fine-grained';Pattern = 'github_pat_[A-Za-z0-9_]{20,}' },
    @{ Name = 'Groq key';           Pattern = 'gsk_[A-Za-z0-9]{20,}' },
    @{ Name = 'Cerebras key';       Pattern = 'csk-[A-Za-z0-9]{20,}' },
    @{ Name = 'OpenRouter key';     Pattern = 'sk-or-v1-[A-Za-z0-9]{20,}' },
    @{ Name = 'Anthropic key';      Pattern = 'sk-ant-[A-Za-z0-9-]{20,}' },
    @{ Name = 'Slack token';        Pattern = 'xox[baprs]-[A-Za-z0-9-]{10,}' },
    @{ Name = 'Google API key';     Pattern = 'AIza[A-Za-z0-9_-]{30,}' },
    @{ Name = 'AWS access key';     Pattern = 'AKIA[0-9A-Z]{16}' },
    @{ Name = 'Private key block';  Pattern = '-----BEGIN [A-Z ]*PRIVATE KEY' },
    @{ Name = 'Bearer token';       Pattern = 'Bearer\s+[A-Za-z0-9._\-]{24,}' },
    @{ Name = 'Assigned secret';    Pattern = '(?i)\b(api[_-]?key|secret|token|passwd|password)\s*[:=]\s*["'']?[A-Za-z0-9_\-]{16,}' }
)

# Shapes that match a pattern above but are provably not credentials. Each entry names why,
# because an unexplained exception is how a real finding gets waved through later.
$BENIGN = @(
    # "risk-assumes-a-new-openrouter-key-must-b" — a task-id slug built from task text.
    @{ Why = 'task-id slug, not a key'; Pattern = 'sk-assumes-a-new-openrouter-key' },
    # "...Update Task-S-1-5-21-<sid>" — a Windows scheduled-task name carrying a local SID.
    # A SID identifies an account on this machine and is useless remotely.
    @{ Why = 'Windows scheduled-task name containing a local SID'; Pattern = 'sk-S-1-5-21-[0-9-]+' }
)

function Test-Publishable {
    param([string]$Path, [string]$Label)
    $text = [System.IO.File]::ReadAllText($Path)
    foreach ($p in $BENIGN) { $text = [regex]::Replace($text, $p.Pattern, '<benign>') }
    $hits = @()
    foreach ($rule in $SECRET_PATTERNS) {
        foreach ($m in [regex]::Matches($text, $rule.Pattern)) {
            # The finding is reported by RULE and POSITION only. Printing the matched text
            # would copy a suspected credential into the job log, which is the same exposure
            # this function exists to prevent, just somewhere less obvious.
            $hits += "$($rule.Name) at offset $($m.Index) in $Label"
        }
    }
    # Returned bare and re-wrapped with @() at the call site. The comma operator was tried
    # here first and is wrong: `,$hits` yields a ONE-element array wrapping the (possibly
    # empty) list, so .Count was 1 even with no findings and the publisher refused every
    # run -- a scan that blocks everything is as useless as one that blocks nothing.
    return $hits
}

if (-not (Test-Path $RepoDir)) { throw "Repo working copy not found: $RepoDir" }

# A worktree, so publishing never touches the checkout Ivan may be working in. Without this
# a 15-minute timer would be checking branches out from under an editor.
$work = Join-Path ([System.IO.Path]::GetTempPath()) "board-live-$PID"
if (Test-Path $work) { Remove-Item $work -Recurse -Force -WhatIf:$false }

$staged = @()
foreach ($item in $PUBLISH) {
    $src = Join-Path $BoardDir $item.Name
    if (-not (Test-Path $src)) {
        if ($item.Required) { throw "Required file missing, refusing to publish a partial board: $src" }
        continue
    }
    $findings = @(Test-Publishable -Path $src -Label $item.Name)
    if ($findings.Count -gt 0) {
        # Refuse the whole publish, not just the offending file. Publishing state.json
        # without board.html would leave the page reporting a fresh timestamp against a
        # board that never arrived — precisely the fresh-looking-and-wrong failure the
        # generator's own publish ordering is designed to avoid.
        throw "REFUSING TO PUBLISH — possible credential material:`n  " + ($findings -join "`n  ")
    }
    $staged += @{ Src = $src; Name = $item.Name }
}

if (@($staged).Count -eq 0) { throw 'Nothing to publish.' }

$local = $null
try {
    # --detach so the worktree is not bound to a branch; the orphan commit is built by hand.
    & git -C $RepoDir worktree add --detach --quiet $work 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git worktree add failed ($LASTEXITCODE)" }

    # -WhatIf:$false throughout this block. These all write inside a throwaway temp
    # worktree, and letting -WhatIf skip them would make a dry run build nothing and then
    # report on the nothing it built -- a rehearsal that exercises none of the real steps.
    Get-ChildItem -Path $work -Force |
        Where-Object { $_.Name -ne '.git' } |
        Remove-Item -Recurse -Force -WhatIf:$false

    foreach ($s in $staged) { Copy-Item -Path $s.Src -Destination (Join-Path $work $s.Name) -Force -WhatIf:$false }

    @(
        '# Fleet board snapshot — generated, not authored',
        '',
        'Written by `scripts/publish-board.ps1` from `reconcile.ps1` every ~15 minutes and',
        'force-pushed as a single commit. This branch carries no site code and is excluded',
        'from Vercel deployment in `vercel.json`.',
        '',
        'Served at https://sdforest.site/web/board/ through `api/board.js`.',
        '',
        'Do not branch from this or merge it anywhere. Its history is rewritten on every run.'
    ) -join "`n" | Set-Content -Path (Join-Path $work 'README.md') -Encoding utf8 -WhatIf:$false

    # A UNIQUE local branch name, not $Branch itself. Worktrees share the repository's
    # refs, so `checkout --orphan board-live` creates a local `board-live` that survives
    # the worktree -- and every later run then dies on "a branch named 'board-live'
    # already exists". That failure is silent unless the exit code is checked, and the
    # run continues from the DETACHED main checkout: the commit it builds carries main's
    # entire history, and the force-push replaces the snapshot branch with 888 commits of
    # site code. That is exactly what happened on the first deployment of this script.
    #
    # The remote branch name is applied at push time by the refspec below, so nothing
    # local is ever named $Branch and there is nothing to collide with.
    $local = "board-snapshot-$PID"
    & git -C $work checkout --orphan $local --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git checkout --orphan failed ($LASTEXITCODE)" }

    # Belt and braces on the same failure. If the orphan checkout ever silently leaves a
    # parent attached, this catches it before anything is pushed rather than after.
    #
    # Checked by OUTPUT, not exit code. `$LASTEXITCODE` after a redirected-and-discarded
    # native call is not dependable across the error preferences this script inherits from
    # reconcile.ps1 -- measured: the identical sequence reports 128 standalone and 0 under
    # the scheduler, so the guard fired on every real run and blocked every publish. With
    # `--verify --quiet` an unborn HEAD prints nothing and a resolved one prints a SHA,
    # which is unambiguous regardless of how the exit code is plumbed.
    $headSha = (& git -C $work rev-parse --verify --quiet HEAD 2>$null | Select-Object -First 1)
    if ($headSha) { throw "Expected an unborn branch; HEAD resolves to $headSha, so this commit would carry history." }

    & git -C $work add -A 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git add failed ($LASTEXITCODE)" }

    # Read as a string, not through ConvertFrom-Json: that parses an ISO timestamp into a
    # DateTime and renders it back in the machine's locale, so the commit trail would read
    # "08/28/2026 09:43:01" instead of the instant the board actually declared.
    $generatedAt = 'unknown'
    try {
        $stateRaw = [System.IO.File]::ReadAllText((Join-Path $work 'state.json'))
        $m = [regex]::Match($stateRaw, '"generatedAt"\s*:\s*"([^"]+)"')
        if ($m.Success) { $generatedAt = $m.Groups[1].Value }
    } catch { }

    & git -C $work -c user.name='board-publisher' -c user.email='board@sdforest.site' `
        commit --quiet -m "board snapshot $generatedAt" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git commit failed ($LASTEXITCODE)" }

    # The snapshot must be a single commit. Verified rather than assumed, because the
    # failure above produced a branch that looked fine from the outside -- the two files
    # resolved over HTTP exactly as expected -- while carrying the whole repository.
    $depth = (& git -C $work rev-list --count HEAD) | Select-Object -First 1
    if ($LASTEXITCODE -ne 0) { throw "git rev-list failed ($LASTEXITCODE)" }
    if ([int]$depth -ne 1) { throw "Refusing to push: snapshot has $depth commits, expected exactly 1." }

    if ($PSCmdlet.ShouldProcess("origin/$Branch", 'force-push board snapshot')) {
        & git -C $work push --force --quiet origin "refs/heads/${local}:refs/heads/$Branch" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "git push failed ($LASTEXITCODE)" }
        Write-Output "published board snapshot $generatedAt to $Branch"
    } else {
        Write-Output "WhatIf: would publish board snapshot $generatedAt to $Branch"
    }
} finally {
    # Always removed. A stale worktree left behind by a failed run would make the next run's
    # `worktree add` fail, turning one bad publish into a permanently broken one.
    & git -C $RepoDir worktree remove --force $work 2>&1 | Out-Null
    if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue -WhatIf:$false }
    & git -C $RepoDir worktree prune 2>&1 | Out-Null
    # The orphan branch is a ref in the shared repository, not in the worktree, so removing
    # the worktree does not remove it. Left behind, one ref per run would accumulate forever.
    if ($local) { & git -C $RepoDir branch -D $local 2>&1 | Out-Null }
}
