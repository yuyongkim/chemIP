<#
.SYNOPSIS
  ChemIP 를 Linux 서버로 올린다(Windows 내장 OpenSSH scp/ssh + tar.exe 만 사용). manifest.txt 에 적힌 것만 올린다.

.DESCRIPTION
  1) manifest.txt 의 code 항목을 code.tar 로 묶는다(제외 패턴 적용, .env 는 항상 제외).
  2) db/state/shareddb 항목은 Python sqlite3 backup API 로 운영 중에도 일관된 스냅숏을 뜬다(원본은 읽기만 한다).
  3) 스테이징 폴더(_staging\incoming)를 서버의 ~/chemip-incoming 으로 scp -C 업로드한다.
  4) 서버에서 install_app.sh 를 sudo 로 실행한다(코드 반영 → venv → npm ci/build → systemd 재시작 → verify.sh).

  .env 는 절대 올리지 않는다. 서버 비밀값은 /etc/chemip/chemip.env 에 사장님이 직접 적는다(env.server.example 참조).

.EXAMPLE
  # 올릴 목록과 용량만 확인(복사·업로드 없음)
  powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -PlanOnly

.EXAMPLE
  # 첫 이전: 코드 + 자료 + 운영 상태 DB 까지
  powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -Server ubuntu@203.0.113.10 -IdentityFile $HOME\.ssh\chemip_cloud -IncludeState

.EXAMPLE
  # 이후 코드만 갱신
  powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -Server ubuntu@203.0.113.10 -IdentityFile $HOME\.ssh\chemip_cloud -Parts code

.EXAMPLE
  # 전환 직전: 운영 상태 DB(요청 게시판·이용 집계)만 최신으로
  powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -Server ubuntu@203.0.113.10 -IdentityFile $HOME\.ssh\chemip_cloud -Parts none -IncludeState

.EXAMPLE
  # 로컬 시험: 업로드 대신 폴더로 복사(서버 설치는 하지 않는다)
  powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -LocalDir E:\dev-cache\chemip-dryrun
#>
[CmdletBinding()]
param(
    [string]$Server,
    [int]$Port = 22,
    [string]$IdentityFile,
    [ValidateSet('code', 'data', 'shared', 'none')]
    [string[]]$Parts = @('code', 'data', 'shared'),
    [switch]$IncludeState,
    [switch]$PlanOnly,
    [string]$LocalDir,
    [switch]$SkipInstall,
    [string]$RepoRoot,
    [string]$StagingDir,
    [string]$KoshaGuideSrc = 'C:\Users\USER\Desktop\EPC engineering\datasets\kosha_guide',
    [string]$ChemengIncidentsSrc = 'C:\Users\USER\Desktop\Chem_Eng\Chem_Eng\data\incidents.db',
    [string]$Python = 'C:\Program Files\Python313\python.exe',
    [string]$RemoteIncoming = 'chemip-incoming'
)

$ErrorActionPreference = 'Stop'
# PowerShell 5.1 은 param 기본값 계산 시점에 $PSScriptRoot 가 비어 있을 수 있어 여기서 채운다
$KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $KitDir '..\..')).Path }
if (-not $StagingDir) { $StagingDir = Join-Path $KitDir '_staging' }
$ManifestPath = Join-Path $KitDir 'manifest.txt'
$IncomingStage = Join-Path $StagingDir 'incoming'
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$TarExe = Join-Path $env:SystemRoot 'System32\tar.exe'

function Write-Step([string]$Message) { Write-Host "[sync] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[sync] 경고: $Message" -ForegroundColor Yellow }

function Format-Size([double]$Bytes) {
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    return ('{0:N0} KB' -f ($Bytes / 1KB))
}

# ---- 매니페스트 ------------------------------------------------------------

function Expand-Source([string]$Raw) {
    $s = $Raw.Replace('${KOSHA_GUIDE_SRC}', $KoshaGuideSrc).Replace('${CHEMENG_INCIDENTS_SRC}', $ChemengIncidentsSrc)
    if ([System.IO.Path]::IsPathRooted($s)) { return $s }
    return (Join-Path $RepoRoot $s)
}

function Read-Manifest {
    $entries = @()
    foreach ($line in [System.IO.File]::ReadAllLines($ManifestPath, [System.Text.Encoding]::UTF8)) {
        $t = $line.Trim()
        if ($t -eq '' -or $t.StartsWith('#')) { continue }
        $f = $t.Split('|') | ForEach-Object { $_.Trim() }
        while ($f.Count -lt 4) { $f += '' }
        $entries += [pscustomobject]@{
            Kind     = $f[0]
            Raw      = $f[1]
            Dest     = $f[2]
            Optional = ($f[3] -eq 'optional')
        }
    }
    return $entries
}

function Test-Excluded([string]$RelPath, [string[]]$Patterns) {
    foreach ($seg in $RelPath.Split('/')) {
        foreach ($p in $Patterns) {
            if ($seg -like $p) { return $true }
        }
    }
    return $false
}

function Get-RelativePath([string]$FullPath) {
    $root = $RepoRoot.TrimEnd('\') + '\'
    if (-not $FullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "저장소 밖 경로는 code 항목이 될 수 없습니다: $FullPath"
    }
    return $FullPath.Substring($root.Length).Replace('\', '/')
}

function Get-CodeFiles($Entries) {
    $patterns = @($Entries | Where-Object Kind -eq 'exclude' | ForEach-Object Raw) + @('.env', '.env.*')
    $files = New-Object System.Collections.Generic.List[object]
    foreach ($e in ($Entries | Where-Object Kind -eq 'code')) {
        $full = Join-Path $RepoRoot $e.Raw
        if ($e.Raw -match '[\*\?]') {
            $items = @(Get-ChildItem -Path $full -File -Force)
        } elseif (Test-Path -LiteralPath $full -PathType Container) {
            $items = @(Get-ChildItem -LiteralPath $full -Recurse -File -Force)
        } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
            $items = @(Get-Item -LiteralPath $full -Force)
        } else {
            throw "manifest 의 code 항목이 없습니다: $($e.Raw)"
        }
        foreach ($i in $items) {
            $rel = Get-RelativePath $i.FullName
            if (-not (Test-Excluded $rel $patterns)) { $files.Add([pscustomobject]@{ Rel = $rel; Length = $i.Length }) }
        }
    }
    return $files
}

# 업로드 대상 목록: Kind, Source(로컬 원본), Stage(스테이징 상대 경로), Snapshot 여부
function Get-DataItems($Entries) {
    $items = @()
    foreach ($e in $Entries) {
        $part = $null; $prefix = $null; $snapshot = $false
        switch ($e.Kind) {
            'db'       { $part = 'data';   $prefix = 'app';    $snapshot = $true }
            'file'     { $part = 'data';   $prefix = 'app' }
            'state'    { $part = 'state';  $prefix = 'app';    $snapshot = $true }
            'shared'   { $part = 'shared'; $prefix = 'shared' }
            'shareddb' { $part = 'shared'; $prefix = 'shared'; $snapshot = $true }
            default    { continue }
        }
        if (-not $part) { continue }
        $src = Expand-Source $e.Raw
        $exists = Test-Path -LiteralPath $src -PathType Leaf
        if (-not $exists -and -not $e.Optional) { throw "manifest 원본이 없습니다: $src" }
        $items += [pscustomobject]@{
            Part     = $part
            Source   = $src
            Stage    = "$prefix/$($e.Dest)"
            Snapshot = $snapshot
            Exists   = $exists
            Length   = $(if ($exists) { (Get-Item -LiteralPath $src).Length } else { 0 })
        }
    }
    return $items
}

function Test-PartSelected([string]$Part) {
    if ($Part -eq 'state') { return [bool]$IncludeState }
    return ($Parts -contains $Part)
}

# ---- 스테이징 --------------------------------------------------------------

function New-CodeTar($Files) {
    $listPath = Join-Path $StagingDir 'code.list'
    $tarPath = Join-Path $IncomingStage 'code.tar'
    [System.IO.File]::WriteAllLines($listPath, [string[]]($Files | ForEach-Object Rel), $Utf8NoBom)
    if (Test-Path -LiteralPath $tarPath) { Remove-Item -LiteralPath $tarPath -Force }
    & $TarExe -cf $tarPath -C $RepoRoot -T $listPath
    if ($LASTEXITCODE -ne 0) { throw "tar 실패(코드 $LASTEXITCODE)" }
    Write-Step ("code.tar: 파일 {0}개, {1}" -f $Files.Count, (Format-Size (Get-Item -LiteralPath $tarPath).Length))
    return 'code.tar'
}

# SQLite 일관 스냅숏(원본은 읽기만). 원본 크기·수정 시각이 같으면 이전 스냅숏을 재사용한다.
function Save-SqliteSnapshot([string]$Source, [string]$Dest) {
    # WAL 모드 DB 는 본 파일 시각이 그대로여도 -wal 에 새 내용이 있을 수 있어 둘 다 본다
    $stamp = (@($Source, "$Source-wal") | Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object {
            $f = Get-Item -LiteralPath $_; '{0}:{1}' -f $f.Length, $f.LastWriteTimeUtc.Ticks }) -join '|'
    $stampPath = "$Dest.srcstamp"
    if ((Test-Path -LiteralPath $Dest) -and (Test-Path -LiteralPath $stampPath) -and ((Get-Content -LiteralPath $stampPath -Raw).Trim() -eq $stamp)) {
        Write-Step "  스냅숏 재사용(원본 변동 없음): $Source"
        return
    }
    $code = @'
import os
import sqlite3
import sys

src, dst = sys.argv[1], sys.argv[2]
tmp = dst + ".part"
if os.path.exists(tmp):
    os.remove(tmp)
s = sqlite3.connect(src)
s.execute("PRAGMA query_only=1")
d = sqlite3.connect(tmp)
s.backup(d, pages=4096)
d.execute("PRAGMA journal_mode=DELETE")
ok = d.execute("PRAGMA quick_check").fetchone()[0]
d.close()
s.close()
if ok != "ok":
    sys.exit("quick_check failed: " + str(ok))
os.replace(tmp, dst)
'@
    # -c 로 넘기지 않고 파일로 써서 실행한다(PowerShell 5.1 은 네이티브 인자 안의 큰따옴표를 망가뜨린다)
    $helper = Join-Path $StagingDir 'sqlite_snapshot.py'
    [System.IO.File]::WriteAllText($helper, $code, $Utf8NoBom)
    & $Python $helper $Source $Dest
    if ($LASTEXITCODE -ne 0) { throw "SQLite 스냅숏 실패: $Source" }
    [System.IO.File]::WriteAllText($stampPath, $stamp, $Utf8NoBom)
}

function Save-DataItem($Item) {
    $dest = Join-Path $IncomingStage ($Item.Stage.Replace('/', '\'))
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    $t = Get-Date
    if ($Item.Snapshot) {
        Save-SqliteSnapshot $Item.Source $dest
    } else {
        Copy-Item -LiteralPath $Item.Source -Destination $dest -Force
    }
    Write-Step ("  {0}  {1}  ({2:N0}s)" -f $Item.Stage, (Format-Size (Get-Item -LiteralPath $dest).Length), ((Get-Date) - $t).TotalSeconds)
}

# ---- 전송 ------------------------------------------------------------------

function Get-SshArgs([switch]$ForScp) {
    $a = @()
    if ($ForScp) { $a += @('-P', "$Port") } else { $a += @('-p', "$Port") }
    $a += @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'ServerAliveInterval=30')
    if ($IdentityFile) { $a += @('-i', $IdentityFile) }
    return $a
}

function Invoke-Remote([string]$Command, [switch]$Tty) {
    $a = Get-SshArgs
    if ($Tty) { $a += '-t' }
    & ssh.exe @a $Server $Command
    if ($LASTEXITCODE -ne 0) { throw "원격 명령 실패(코드 $LASTEXITCODE): $Command" }
}

function Send-Files([string[]]$StageRels) {
    $dirs = $StageRels | ForEach-Object { "$RemoteIncoming/" + (Split-Path $_ -Parent).Replace('\', '/') } | Sort-Object -Unique
    Invoke-Remote ("mkdir -p " + (($dirs | ForEach-Object { "'" + $_.TrimEnd('/') + "'" }) -join ' '))
    foreach ($rel in $StageRels) {
        $local = Join-Path $IncomingStage ($rel.Replace('/', '\'))
        $t = Get-Date
        Write-Step ("업로드 {0} ({1})" -f $rel, (Format-Size (Get-Item -LiteralPath $local).Length))
        & scp.exe -C @(Get-SshArgs -ForScp) $local ("{0}:{1}/{2}" -f $Server, $RemoteIncoming, $rel)
        if ($LASTEXITCODE -ne 0) { throw "scp 실패: $rel" }
        Write-Step ("  완료 {0:N0}s" -f ((Get-Date) - $t).TotalSeconds)
    }
}

function Copy-ToLocalDir([string[]]$StageRels) {
    $target = Join-Path $LocalDir 'incoming'
    foreach ($rel in $StageRels) {
        $src = Join-Path $IncomingStage ($rel.Replace('/', '\'))
        $dst = Join-Path $target ($rel.Replace('/', '\'))
        New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }
    Write-Step "로컬 폴더로 복사 완료: $target"
}

function Invoke-RemoteInstall {
    $inc = $RemoteIncoming
    $cmd = "set -e; cd ~; if [ -f $inc/code.tar ]; then rm -rf $inc/kit; mkdir -p $inc/kit; " +
           "tar -xf $inc/code.tar -C $inc/kit deploy/linux; k=$inc/kit/deploy/linux; " +
           "else k=/srv/chemip/app/deploy/linux; fi; sudo bash `$k/install_app.sh `$HOME/$inc"
    Write-Step "서버 설치 실행(install_app.sh)"
    Invoke-Remote $cmd -Tty
}

# ---- 실행 ------------------------------------------------------------------

function Show-Plan($CodeFiles, $DataItems) {
    $codeBytes = ($CodeFiles | Measure-Object Length -Sum).Sum
    Write-Host ''
    Write-Host ('{0,-8} {1,-58} {2,12}' -f '구분', '대상', '크기')
    Write-Host ('{0,-8} {1,-58} {2,12}' -f 'code', ("code.tar (파일 {0}개, 압축 전)" -f $CodeFiles.Count), (Format-Size $codeBytes))
    $total = [double]$codeBytes
    foreach ($i in $DataItems) {
        $mark = ''
        if (-not $i.Exists) { $mark = ' (없음-건너뜀)' }
        elseif (-not (Test-PartSelected $i.Part)) { $mark = ' (이번엔 제외)' }
        else { $total += $i.Length }
        Write-Host ('{0,-8} {1,-58} {2,12}' -f $i.Part, ($i.Stage + $mark), (Format-Size $i.Length))
    }
    Write-Host ('{0,-8} {1,-58} {2,12}' -f '합계', '(이번 실행에 올라갈 양)', (Format-Size $total))
    Write-Host ''
}

function Main {
    if (-not $PlanOnly -and -not $LocalDir -and -not $Server) {
        throw '-Server user@host 또는 -LocalDir 또는 -PlanOnly 중 하나가 필요합니다.'
    }
    $entries = Read-Manifest
    $codeFiles = Get-CodeFiles $entries
    $dataItems = Get-DataItems $entries
    Show-Plan $codeFiles $dataItems
    if ($PlanOnly) { return }

    New-Item -ItemType Directory -Force -Path $IncomingStage | Out-Null
    $send = @()
    if ($Parts -contains 'code') { $send += New-CodeTar $codeFiles }
    foreach ($i in $dataItems) {
        if (-not $i.Exists) { Write-Warn "원본 없음, 건너뜀: $($i.Source)"; continue }
        if (-not (Test-PartSelected $i.Part)) { continue }
        Save-DataItem $i
        $send += $i.Stage
    }
    if ($send.Count -eq 0) { Write-Warn '올릴 것이 없습니다.'; return }

    if ($LocalDir) {
        Copy-ToLocalDir $send
        Write-Step "다음: (WSL/Linux) bash <app>/deploy/linux/install_app.sh $LocalDir/incoming"
        return
    }
    Send-Files $send
    if ($SkipInstall) {
        Write-Step "업로드만 완료(-SkipInstall). 서버에서: sudo bash ~/chemip-incoming/kit/deploy/linux/install_app.sh ~/chemip-incoming"
        return
    }
    Invoke-RemoteInstall
}

Main
