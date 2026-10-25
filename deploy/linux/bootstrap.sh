#!/usr/bin/env bash
# ChemIP 서버 OS 준비 — Ubuntu 22.04 / 24.04, arm64(Oracle A1) · amd64(Contabo) 공용. 여러 번 돌려도 같은 결과(멱등).
#
# 하는 일: 시스템 패키지 · Node.js LTS · cloudflared · 서비스 계정(chemip) · /srv/chemip 디렉터리 ·
#          방화벽(ssh 만 허용, 앱은 127.0.0.1 에서만 듣는다) · RAM 8 GB 미만이면 스왑.
# 하지 않는 일: 앱 코드 설치·빌드(install_app.sh), 비밀값 입력(/etc/chemip/chemip.env 는 빈 틀만 만든다).
#
# 사용:  sudo bash bootstrap.sh            # 실제 적용
#        DRY_RUN=1 bash bootstrap.sh       # 무엇을 할지 출력만(루트 불필요)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=layout.env
source "$HERE/layout.env"

DRY_RUN="${DRY_RUN:-0}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-}}"

log()  { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bootstrap] 경고:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[bootstrap] 중단:\033[0m %s\n' "$*" >&2; exit 1; }

# 명령 실행(DRY_RUN=1 이면 출력만)
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '  + %s\n' "$*"
  else
    "$@"
  fi
}

# 표준입력 내용을 파일로 쓴다(DRY_RUN=1 이면 대상만 출력)
write_file() {
  local dest="$1" mode="$2"
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '  + write %s (mode %s)\n' "$dest" "$mode"
    cat >/dev/null
  else
    install -D -m "$mode" /dev/stdin "$dest"
  fi
}

check_platform() {
  [[ -r /etc/os-release ]] || die "/etc/os-release 가 없습니다. Ubuntu 서버에서 실행하십시오."
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || warn "Ubuntu 가 아닙니다(ID=${ID:-?}). 계속 진행합니다."
  case "${VERSION_ID:-}" in
    22.04|24.04) ;;
    *) warn "검증한 버전은 22.04/24.04 입니다(현재 ${VERSION_ID:-?})." ;;
  esac
  ARCH="$(dpkg --print-architecture)"
  case "$ARCH" in
    amd64|arm64) log "플랫폼: Ubuntu ${VERSION_ID:-?} / $ARCH" ;;
    *) die "지원하지 않는 아키텍처: $ARCH (amd64·arm64 만 지원)" ;;
  esac
  if [[ "$DRY_RUN" != "1" && "$(id -u)" -ne 0 ]]; then
    die "root 권한이 필요합니다: sudo bash $0"
  fi
}

install_base_packages() {
  log "기본 패키지 설치"
  run env DEBIAN_FRONTEND=noninteractive apt-get update -y
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg rsync sqlite3 tar xz-utils git \
    python3 python3-venv python3-dev python3-pip build-essential ufw
}

install_node() {
  local current=""
  if command -v node >/dev/null 2>&1; then
    current="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  fi
  if [[ -n "$current" && "$current" -ge "$CHEMIP_NODE_MAJOR" ]]; then
    log "Node.js v$current 이미 설치됨 — 건너뜀"
    return
  fi
  log "Node.js ${CHEMIP_NODE_MAJOR}.x LTS 설치(NodeSource)"
  run install -d -m 0755 /etc/apt/keyrings
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '  + curl nodesource gpg key | gpg --dearmor > /etc/apt/keyrings/nodesource.gpg\n'
  else
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  fi
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${CHEMIP_NODE_MAJOR}.x nodistro main" \
    | write_file /etc/apt/sources.list.d/nodesource.list 0644
  run env DEBIAN_FRONTEND=noninteractive apt-get update -y
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    log "cloudflared 이미 설치됨 — 건너뜀"
    return
  fi
  log "cloudflared 설치(Cloudflare apt 저장소)"
  run install -d -m 0755 /usr/share/keyrings
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '  + curl cloudflare-main.gpg > /usr/share/keyrings/cloudflare-main.gpg\n'
  else
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  fi
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
    | write_file /etc/apt/sources.list.d/cloudflared.list 0644
  run env DEBIAN_FRONTEND=noninteractive apt-get update -y
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y cloudflared
}

create_service_user() {
  if id "$CHEMIP_USER" >/dev/null 2>&1; then
    log "계정 $CHEMIP_USER 이미 있음"
  else
    log "서비스 계정 $CHEMIP_USER 생성(로그인 불가)"
    run useradd --system --user-group --home-dir "$CHEMIP_ROOT" --no-create-home \
      --shell /usr/sbin/nologin "$CHEMIP_USER"
  fi
  if [[ -n "$DEPLOY_USER" && "$DEPLOY_USER" != "root" ]]; then
    log "배포 계정 $DEPLOY_USER 를 $CHEMIP_USER 그룹에 추가(로그 읽기용)"
    run usermod -aG "$CHEMIP_USER" "$DEPLOY_USER"
  fi
}

create_directories() {
  log "디렉터리 준비: $CHEMIP_ROOT"
  local d
  for d in "$CHEMIP_ROOT" "$CHEMIP_APP" "$CHEMIP_APP/data" "$CHEMIP_APP/data/prtr" "$CHEMIP_APP/logs" \
           "$CHEMIP_SHARED" "$CHEMIP_SHARED/kosha_guide/normalized" "$CHEMIP_SHARED/siblings" \
           "$CHEMIP_ROOT/.npm" "$CHEMIP_ROOT/.cache"; do
    run install -d -m 0750 -o "$CHEMIP_USER" -g "$CHEMIP_USER" "$d"
  done
  run install -d -m 0750 -o root -g "$CHEMIP_USER" "$CHEMIP_ENV_DIR"
  if [[ -f "$CHEMIP_ENV_FILE" ]]; then
    log "$CHEMIP_ENV_FILE 이미 있음 — 그대로 둠(비밀값 보존)"
  else
    log "$CHEMIP_ENV_FILE 빈 틀 생성 — 값은 사장님이 직접 채웁니다"
    write_file "$CHEMIP_ENV_FILE" 0640 <"$HERE/env.server.example"
    run chown root:"$CHEMIP_USER" "$CHEMIP_ENV_FILE"
  fi
}

configure_firewall() {
  # Oracle Cloud 우분투 이미지는 iptables-persistent 규칙(ssh 만 허용)을 이미 갖고 있다.
  # 여기에 ufw 를 겹치면 규칙이 꼬이므로 그 경우에는 기존 규칙을 유지한다.
  if [[ -f /etc/iptables/rules.v4 ]] && systemctl is-enabled netfilter-persistent >/dev/null 2>&1; then
    log "방화벽: OCI iptables 규칙 감지 — ufw 를 켜지 않고 기존 규칙(ssh 만 허용) 유지"
    return
  fi
  log "방화벽: ufw — 들어오는 연결은 ssh 만 허용"
  run ufw default deny incoming
  run ufw default allow outgoing
  run ufw allow OpenSSH
  run ufw --force enable
}

configure_swap() {
  local mem_mb swap_kb
  mem_mb=$(( $(awk '/^MemTotal:/ {print $2}' /proc/meminfo) / 1024 ))
  swap_kb="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)"
  if (( mem_mb >= CHEMIP_SWAP_THRESHOLD_MB )); then
    log "RAM ${mem_mb} MiB — 스왑 불필요"
    return
  fi
  if (( swap_kb > 0 )); then
    log "RAM ${mem_mb} MiB, 스왑 이미 있음($(( swap_kb / 1024 )) MiB) — 건너뜀"
    return
  fi
  log "RAM ${mem_mb} MiB < ${CHEMIP_SWAP_THRESHOLD_MB} MiB — /swapfile ${CHEMIP_SWAP_SIZE_GB} GB 생성(Next 빌드 대비)"
  if [[ ! -f /swapfile ]]; then
    run fallocate -l "${CHEMIP_SWAP_SIZE_GB}G" /swapfile
    run chmod 600 /swapfile
    run mkswap /swapfile
  fi
  run swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    if [[ "$DRY_RUN" == "1" ]]; then
      printf '  + append "/swapfile none swap sw 0 0" to /etc/fstab\n'
    else
      echo '/swapfile none swap sw 0 0' >>/etc/fstab
    fi
  fi
}

main() {
  check_platform
  install_base_packages
  install_node
  install_cloudflared
  create_service_user
  create_directories
  configure_firewall
  configure_swap
  log "완료. 다음 단계: Windows 에서 sync_to_server.ps1 실행 → 서버에서 install_app.sh 가 자동 실행됩니다."
  if [[ -n "$DEPLOY_USER" && "$DEPLOY_USER" != "root" ]]; then
    log "그룹 변경은 다음 ssh 로그인부터 적용됩니다($DEPLOY_USER)."
  fi
}

main "$@"
