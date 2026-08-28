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

    The snapshot commit contains exactly $EXPECTED_FILES and nothing else: board.html and
    state.json copied from $BoardDir, plus a generated vercel.json that disables Vercel
    deployment for this branch (without it, every publish builds the site — measured).
    The tree is asserted against that list before the push. claims.jsonl, pr-cache.json and
    jules-cache.json stay local — the first because it carries session paths and branch
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

# One generated file, and it is load-bearing rather than documentation.
#
# vercel.json's `git.deploymentEnabled` is read from the branch being pushed, not from main.
# Setting it on main therefore did nothing for this branch, and the "publishing never
# rebuilds the site" claim was simply false: measured on 2026-08-28, every one of the first
# nine board-live pushes created a Preview deployment. At a 15-minute cadence that is ~96
# builds a day of a branch containing no site code.
#
# The fix has to live on the orphan branch, so the snapshot carries a minimal vercel.json
# that disables deployment for itself. An earlier version also wrote a README explaining the
# branch; that one was documentation, it made every statement of the boundary need a
# footnote, and it is gone. This file earns its place by doing something.
$VERCEL_CONFIG = '{ "git": { "deploymentEnabled": false } }'
$GENERATED = @('vercel.json')
$EXPECTED_FILES = @($PUBLISH.Name) + $GENERATED

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
    param([byte[]]$Bytes, [string]$Label)

    # Scanning only the UTF-8 decode left a hole: the BYTES are what get published, and a
    # credential encoded some other way -- UTF-16LE, or anything NUL-interleaved -- decodes
    # to mojibake that matches no pattern here while the original bytes reach the public
    # branch intact. The gate has to see what the reader will.
    #
    # NUL is refused outright first. board.html and state.json are text written by
    # reconcile.ps1; a NUL byte means the file is not what this script takes it for, and
    # there is no version of that worth publishing.
    if ([Array]::IndexOf($Bytes, [byte]0) -ge 0) {
        return @("binary content (NUL byte) in $Label; refusing a file this gate cannot read as text")
    }

    # Then three views.
    #
    #   UTF-8      -- the expected encoding.
    #   Latin-1    -- byte-for-byte, catching anything whose UTF-8 decode would have mangled
    #                 a pattern into safety.
    #   Entity-decoded -- because the published file is HTML and the browser renders it. A
    #                 credential written `&#115;&#107;-...` matches none of these patterns as
    #                 stored and reads as `sk-...` on screen. Scanning only the source text
    #                 checks a representation nobody sees; the gate has to scan what the page
    #                 will actually show.
    $utf8 = [System.Text.Encoding]::UTF8.GetString($Bytes)
    $decoded = [regex]::Replace($utf8, '&#(x[0-9a-fA-F]+|\d+);?', {
        param($m)
        $token = $m.Groups[1].Value
        try {
            $code = if ($token[0] -eq 'x' -or $token[0] -eq 'X') {
                [Convert]::ToInt32($token.Substring(1), 16)
            } else { [int]$token }
            if ($code -ge 0 -and $code -le 0x10FFFF) { [char]::ConvertFromUtf32($code) } else { $m.Value }
        } catch { $m.Value }
    })
    # A fourth view with tags removed, so a credential split across markup --
    # `s<span>k-</span>...` -- is scanned as the browser will show it rather than as the
    # source stores it.
    $stripped = [regex]::Replace($decoded, '<[^>]*>', '')

    # HONEST LIMIT: this is four textual views, not an HTML parser, and a determined
    # encoding will always be able to render as one thing and store as another. It is a net,
    # not a proof. What actually keeps credentials off this branch is that board.html is
    # generated by reconcile.ps1 from task text and PR titles, none of which should ever
    # carry one -- anybody able to inject arbitrary markup into it already owns the machine
    # that holds the keys. The scan exists to catch the accident, and it is deliberately
    # broader than the realistic threat rather than narrower.
    $hits = @()
    foreach ($view in @(
        $utf8,
        [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($Bytes),
        $decoded,
        $stripped)) {
        $text = $view
        foreach ($p in $BENIGN) { $text = [regex]::Replace($text, $p.Pattern, '<benign>') }
        foreach ($rule in $SECRET_PATTERNS) {
            foreach ($m in [regex]::Matches($text, $rule.Pattern)) {
                # Reported by RULE and POSITION only. Printing the matched text would copy a
                # suspected credential into the job log, which is the same exposure this
                # function exists to prevent, just somewhere less obvious.
                $hits += "$($rule.Name) at offset $($m.Index) in $Label"
            }
        }
    }
    # Returned bare and re-wrapped with @() at the call site. The comma operator was tried
    # here first and is wrong: `,$hits` yields a ONE-element array wrapping the (possibly
    # empty) list, so .Count was 1 even with no findings and the publisher refused every
    # run -- a scan that blocks everything is as useless as one that blocks nothing.
    # De-duplicated: the same credential is found once per view, and reporting it twice
    # would suggest two problems.
    return ($hits | Select-Object -Unique)
}

if (-not (Test-Path $RepoDir)) { throw "Repo working copy not found: $RepoDir" }

# This script force-pushes, unattended, on a timer. "The destination is fixed" was only ever
# true of the branch NAME -- the repository it lands in came from whatever `origin` happened
# to point at, so a changed remote would have sent the snapshot somewhere else entirely and
# overwritten a branch there. Asserted rather than assumed.
# Matched on HOST AND FULL PATH, not as a substring. A substring test accepts
# github.com/ivangegovdve-sudo/orchestrator-gpt-evil, and evil.example.com/…/orchestrator-gpt,
# both of which would have been force-pushed to happily.
$EXPECTED_REMOTE = 'ivangegovdve-sudo/orchestrator-gpt'
# BOTH urls. `git push origin` follows remote.origin.pushurl when one is configured, so
# validating only the fetch url leaves the destination that actually receives the
# force-push unchecked -- which is the one that matters.
$pattern = '^(https://github\.com/|git@github\.com:)' + [regex]::Escape($EXPECTED_REMOTE) + '(\.git)?/?$'
# EVERY url, not the first. A remote may carry several pushurls and `git push` sends to all
# of them, so checking one and pushing to several validates the wrong thing entirely.
$fetchUrls = @(& git -C $RepoDir remote get-url --all origin 2>$null)
$pushUrls  = @(& git -C $RepoDir remote get-url --push --all origin 2>$null)
if (@($fetchUrls).Count -eq 0) { throw "No 'origin' remote in $RepoDir." }
foreach ($u in @($fetchUrls)) {
    if ($u -notmatch $pattern) { throw "Refusing to publish: origin fetch url '$u' is not github.com/$EXPECTED_REMOTE." }
}
foreach ($u in @($pushUrls)) {
    if ($u -notmatch $pattern) { throw "Refusing to publish: origin push url '$u' is not github.com/$EXPECTED_REMOTE." }
}

# A worktree, so publishing never touches the checkout Ivan may be working in. Without this
# a 15-minute timer would be checking branches out from under an editor.
# REFUSED rather than reclaimed if it already exists. Deleting a path just because it
# carries this run's PID assumes the name is ours; PIDs are reused, a concurrent run may
# hold it, and nothing stops an unrelated directory sitting there. The name includes a
# random component so a collision is a genuine anomaly rather than routine, and a genuine
# anomaly should stop the run, not trigger a recursive delete of somebody else's data.
$work = Join-Path ([System.IO.Path]::GetTempPath()) ("board-live-$PID-" + [System.IO.Path]::GetRandomFileName().Replace('.', ''))
if (Test-Path $work) { throw "Refusing to publish: temporary path already exists: $work" }

$staged = @()
foreach ($item in $PUBLISH) {
    $src = Join-Path $BoardDir $item.Name
    if (-not (Test-Path $src)) {
        if ($item.Required) { throw "Required file missing, refusing to publish a partial board: $src" }
        continue
    }
    # Read ONCE, here, and published from these bytes. Scanning the path and then copying
    # the path reads the file twice, and reconcile.ps1 rewrites this directory every ~15
    # minutes: a regeneration landing between the two reads would publish content that was
    # never scanned. The gate has to cover the bytes that actually go out, not a snapshot
    # of the same filename taken a moment earlier.
    $bytes = [System.IO.File]::ReadAllBytes($src)
    $findings = @(Test-Publishable -Bytes $bytes -Label $item.Name)
    if ($findings.Count -gt 0) {
        # Refuse the whole publish, not just the offending file. Publishing state.json
        # without board.html would leave the page reporting a fresh timestamp against a
        # board that never arrived — precisely the fresh-looking-and-wrong failure the
        # generator's own publish ordering is designed to avoid.
        throw "REFUSING TO PUBLISH — possible credential material:`n  " + ($findings -join "`n  ")
    }
    $staged += @{ Bytes = $bytes; Name = $item.Name }
}

if (@($staged).Count -eq 0) { throw 'Nothing to publish.' }

# The two files are read separately, and reconcile.ps1 rewrites this directory every ~15
# minutes, so a regeneration landing between the two reads yields an old board carrying a
# new timestamp. The page refuses that pair on sight -- it requires the board's own
# GENERATED to equal state.json's generatedAt -- so publishing it would put up a snapshot
# that renders nothing while this script reported success. Caught here instead, where the
# fix is simply to wait for the next run.
$boardText = [System.Text.Encoding]::UTF8.GetString((@($staged) | Where-Object { $_.Name -eq 'board.html' }).Bytes)
$stateText = [System.Text.Encoding]::UTF8.GetString((@($staged) | Where-Object { $_.Name -eq 'state.json' }).Bytes)
$boardStamp = [regex]::Match($boardText, '(?m)^GENERATED\s+(\S+)')
# Parsed, not pattern-matched. The page reads the TOP-LEVEL generatedAt; a regex takes the
# first one anywhere in the document, so a nested property of the same name would let a
# mismatched pair through this check and be rejected by the browser instead.
$stateJson = $stateText | ConvertFrom-Json
$stateGenerated = if ($stateJson.PSObject.Properties.Name -contains 'generatedAt') { $stateJson.generatedAt } else { $null }
if (-not $boardStamp.Success) { throw 'board.html declares no GENERATED timestamp; refusing to publish it.' }
if (-not $stateGenerated) { throw 'state.json has no top-level generatedAt; refusing to publish it.' }

# Compared as INSTANTS, not as strings. ConvertFrom-Json turns an ISO timestamp into a
# DateTime, which stringifies in the machine's locale -- so a string comparison against the
# board's "2026-08-28T10:58:05Z" fails against "08/28/2026 10:58:05" even when the two
# describe the same moment, and this guard rejected every publish the moment it was added.
$boardInstant = [datetimeoffset]::Parse($boardStamp.Groups[1].Value).ToUniversalTime()
$stateInstant = if ($stateGenerated -is [datetime]) {
    [datetimeoffset]::new([datetime]::SpecifyKind($stateGenerated, 'Utc')).ToUniversalTime()
} else {
    [datetimeoffset]::Parse([string]$stateGenerated).ToUniversalTime()
}
if ($boardInstant -ne $stateInstant) {
    throw ("Refusing to publish a torn snapshot: board.html says $($boardInstant.ToString('o')) " +
           "but state.json says $($stateInstant.ToString('o')). A regeneration landed between the two reads.")
}

$local = $null
# Set only once `checkout --orphan` has actually created the branch, so the cleanup in
# `finally` can never delete a ref this run did not make.
$createdBranch = $null
# Set once `worktree add` has actually created the directory; see the cleanup in `finally`.
$createdWork = $null
try {
    # --detach so the worktree is not bound to a branch; the orphan commit is built by hand.
    & git -C $RepoDir worktree add --detach --quiet $work 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git worktree add failed ($LASTEXITCODE)" }
    # Only now is this directory ours. The cleanup below is keyed off this rather than off
    # the path existing, so a failed `worktree add` -- or anything else that happens to
    # occupy the path -- is never recursively deleted by us.
    $createdWork = $work

    # -WhatIf:$false throughout this block. These all write inside a throwaway temp
    # worktree, and letting -WhatIf skip them would make a dry run build nothing and then
    # report on the nothing it built -- a rehearsal that exercises none of the real steps.
    Get-ChildItem -Path $work -Force |
        Where-Object { $_.Name -ne '.git' } |
        Remove-Item -Recurse -Force -WhatIf:$false

    # Written from the scanned bytes rather than re-copied from disk, so what is published
    # is byte-identical to what the gate approved.
    foreach ($f in $staged) { [System.IO.File]::WriteAllBytes((Join-Path $work $f.Name), $f.Bytes) }
    # Not scanned, because it is a literal from this file rather than anything from $BoardDir.
    [System.IO.File]::WriteAllText((Join-Path $work 'vercel.json'), $VERCEL_CONFIG + "`n", (New-Object System.Text.UTF8Encoding($false)))


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
    # Refuse rather than reuse if the name is already taken. Without this a PID collision,
    # or a branch left by an earlier crash, would send us into the failure path below -- and
    # the cleanup in `finally` would then delete a branch this run never created.
    & git -C $RepoDir show-ref --verify --quiet "refs/heads/$local" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { throw "Local branch $local already exists; refusing to reuse or delete it." }

    & git -C $work checkout --orphan $local --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git checkout --orphan failed ($LASTEXITCODE)" }
    # Only now is the branch ours to clean up.
    $createdBranch = $local

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

    # The contract is checked, not just written down. Anything that ever adds a file to this
    # tree -- a stray temp file, a future edit -- fails here instead of being published.
    $tree = @(& git -C $work ls-tree --name-only HEAD)
    $unexpected = @($tree | Where-Object { $EXPECTED_FILES -notcontains $_ })
    if ($unexpected.Count -gt 0) { throw "Refusing to push: unexpected file(s) in the snapshot: $($unexpected -join ', ')" }
    $missing = @($EXPECTED_FILES | Where-Object { $tree -notcontains $_ })
    if ($missing.Count -gt 0) { throw "Refusing to push: missing file(s) from the snapshot: $($missing -join ', ')" }

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
    if ($createdWork) {
        & git -C $RepoDir worktree remove --force $createdWork 2>&1 | Out-Null
        if (Test-Path $createdWork) { Remove-Item $createdWork -Recurse -Force -ErrorAction SilentlyContinue -WhatIf:$false }
    }
    & git -C $RepoDir worktree prune 2>&1 | Out-Null
    # The orphan branch is a ref in the shared repository, not in the worktree, so removing
    # the worktree does not remove it. Left behind, one ref per run would accumulate forever.
    if ($createdBranch) { & git -C $RepoDir branch -D $createdBranch 2>&1 | Out-Null }
}
