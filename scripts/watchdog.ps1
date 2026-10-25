# ChemIP watchdog: 로컬 백엔드/프론트/공개 도메인을 점검하고 죽은 PM2 앱만 재시작한다.
# cloudflared는 다른 도메인과 공유하므로 건드리지 않고 로그만 남긴다.
#
# 2026-10-10 개선: 평상시(모두 정상)에는 PM2를 호출하지 않는다 -> 5분마다 콘솔창이
# 번쩍이던 문제 제거. 문제가 감지될 때만 PM2를 '숨김(-WindowStyle Hidden)'으로 실행한다.
$ErrorActionPreference = 'Continue'
$log = 'G:\MSDS\logs\watchdog.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Add-Content -Path $log -Encoding utf8 }
function Probe($u) { try { (Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 20).StatusCode } catch { 0 } }

# PM2 를 창 없이 실행한다. (Start-Process -WindowStyle Hidden 로 콘솔 플래시 방지)
function Pm2([string[]]$pm2Args) {
    $pm2 = (Get-Command pm2 -ErrorAction SilentlyContinue).Source
    if (-not $pm2) { $pm2 = "$env:APPDATA\npm\pm2.cmd" }
    try {
        Start-Process -FilePath $pm2 -ArgumentList $pm2Args -WindowStyle Hidden -Wait -ErrorAction Stop
    } catch {
        Log "pm2 $($pm2Args -join ' ') 실행 실패: $($_.Exception.Message)"
    }
}

if ((Get-Item $log -ErrorAction SilentlyContinue).Length -gt 5MB) { Move-Item $log "$log.old" -Force }

# 1) 순수 HTTP 점검만 수행한다 (창 안 뜸).
$backend  = Probe 'http://127.0.0.1:7011/health'
$frontend = Probe 'http://127.0.0.1:7000/'

# 2) 하나라도 죽었을 때만 PM2 에 손댄다.
if ($backend -ne 200 -or $frontend -ne 200) {
    Pm2 @('resurrect')   # 데몬이 죽어 있으면 저장된 목록으로 복구
    if ($backend -ne 200) {
        Log 'backend /health FAIL -> pm2 restart T3-ChemIP-Backend'
        Pm2 @('restart', 'T3-ChemIP-Backend')
    }
    if ($frontend -ne 200) {
        Log 'frontend FAIL -> pm2 restart T3-ChemIP-Frontend'
        Pm2 @('restart', 'T3-ChemIP-Frontend')
    }
    Start-Sleep 20
}

# 3) 공개 도메인 점검은 창을 띄우지 않으므로(단순 HTTP) 항상 수행한다.
#    로컬이 정상이어도 터널만 죽는 경우를 잡기 위함. 조치는 안 하고 로그만 남긴다.
$pub = Probe 'https://chemip.yule.pics/api/chemicals/001067'
if ($pub -ne 200) { Log "public API FAIL status=$pub (tunnel 점검 필요)" }
