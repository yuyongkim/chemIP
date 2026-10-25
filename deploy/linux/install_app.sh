#!/usr/bin/env bash
# ChemIP 앱 설치·갱신 — sync_to_server.ps1 이 올린 묶음(incoming 폴더)을 /srv/chemip 에 반영한다. 멱등.
#
#   incoming/code.tar      → /srv/chemip/app (rsync --delete, data/ logs/ node_modules/ .next/ 는 보존)
#   incoming/app/**        → /srv/chemip/app/** (DB 교체 시 백엔드를 잠시 멈추고 낡은 -wal/-shm 을 지운다)
#   incoming/shared/**     → /srv/chemip/shared/**
#   이후: Python venv(요구사항이 바뀐 때만 pip) → npm ci(lock 이 바뀐 때만) → next build(코드가 바뀐 때) →
#         systemd 유닛 설치·재시작 → verify.sh
#
# 사용:  sudo bash install_app.sh ~/chemip-incoming
# 로컬 시험(루트·systemd 없이):  CHEMIP_ROOT=/tmp/x bash install_app.sh --no-systemd --no-frontend --no-verify /tmp/x/incoming
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=layout.env
source "$HERE/layout.env"

USE_SYSTEMD=1
DO_FRONTEND=1
DO_VERIFY=1
INCOMING=""
CODE_CHANGED=0
DATA_INCOMING=0

log()  { printf '\033[1;34m[install]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[install] 중단:\033[0m %s\n' "$*" >&2; exit 1; }

is_root() { [[ "$(id -u)" -eq 0 ]]; }

# 서비스 계정으로 실행(루트가 아니면 현재 계정 그대로)
as_app() {
  if is_root; then
    runuser -u "$CHEMIP_USER" -- env HOME="$CHEMIP_ROOT" "$@"
  else
    "$@"
  fi
}

parse_args() {
  while (( $# )); do
    case "$1" in
      --no-systemd) USE_SYSTEMD=0 ;;
      --no-frontend) DO_FRONTEND=0 ;;
      --no-verify) DO_VERIFY=0 ;;
      -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
      *) INCOMING="$1" ;;
    esac
    shift
  done
  [[ -n "$INCOMING" ]] || die "incoming 폴더를 지정하십시오: sudo bash $0 ~/chemip-incoming"
  [[ -d "$INCOMING" ]] || die "폴더가 없습니다: $INCOMING"
  INCOMING="$(cd "$INCOMING" && pwd)"
  if (( USE_SYSTEMD )) && ! is_root; then
    die "systemd 설치에는 root 가 필요합니다(sudo). 로컬 시험이면 --no-systemd 를 주십시오."
  fi
}

service_active() { (( USE_SYSTEMD )) && systemctl is-active --quiet "$1"; }

install_code() {
  local tarball="$INCOMING/code.tar" tmp
  if [[ ! -f "$tarball" ]]; then
    log "code.tar 없음 — 코드 갱신 건너뜀"
    return
  fi
  log "코드 반영: $tarball → $CHEMIP_APP"
  tmp="$(mktemp -d)"
  tar --no-same-owner --warning=no-timestamp -xf "$tarball" -C "$tmp"
  mkdir -p "$CHEMIP_APP"
  rsync -rlt --delete \
    --exclude=/data/ --exclude=/logs/ \
    --exclude=/frontend/node_modules/ --exclude=/frontend/.next/ --exclude=/frontend/next-env.d.ts \
    "$tmp"/ "$CHEMIP_APP"/
  rm -rf "$tmp"
  rm -f "$tarball"
  CODE_CHANGED=1
}

# $1 의 파일들을 같은 상대 경로로 $2 아래에 옮긴다. SQLite 면 낡은 -wal/-shm 을 지운다.
move_tree() {
  local src="$1" dest_root="$2" f rel dest
  [[ -d "$src" ]] || return 0
  while IFS= read -r -d '' f; do
    rel="${f#"$src"/}"
    dest="$dest_root/$rel"
    mkdir -p "$(dirname "$dest")"
    mv -f "$f" "$dest.incoming"
    mv -f "$dest.incoming" "$dest"
    case "$dest" in
      *.db|*.sqlite) rm -f "$dest-wal" "$dest-shm" ;;
    esac
    log "  자료: $rel ($(du -h "$dest" | cut -f1))"
  done < <(find "$src" -type f -print0)
  find "$src" -depth -type d -empty -delete
}

install_data() {
  if [[ -z "$(find "$INCOMING/app" "$INCOMING/shared" -type f -print -quit 2>/dev/null)" ]]; then
    log "올라온 자료 없음 — 자료 갱신 건너뜀"
    return
  fi
  DATA_INCOMING=1
  if service_active chemip-backend; then
    log "DB 교체 전 백엔드 정지"
    systemctl stop chemip-backend
  fi
  move_tree "$INCOMING/app" "$CHEMIP_APP"
  move_tree "$INCOMING/shared" "$CHEMIP_SHARED"
}

fix_permissions() {
  mkdir -p "$CHEMIP_APP/data" "$CHEMIP_APP/logs" "$CHEMIP_SHARED"
  if ! is_root; then
    return
  fi
  log "권한 정리($CHEMIP_USER:$CHEMIP_USER, 다른 사용자 접근 불가)"
  chown -R "$CHEMIP_USER:$CHEMIP_USER" "$CHEMIP_APP" "$CHEMIP_SHARED"
  chmod -R u=rwX,g=rX,o= "$CHEMIP_APP" "$CHEMIP_SHARED"
  chmod 0750 "$CHEMIP_ROOT"
}

pip_install() {
  local cache_opt=(--no-cache-dir)
  [[ -n "${PIP_CACHE_DIR:-}" ]] && cache_opt=()
  if "$CHEMIP_VENV/bin/python" -m pip --version >/dev/null 2>&1; then
    "$CHEMIP_VENV/bin/python" -m pip install "${cache_opt[@]}" --disable-pip-version-check -q "$@"
  else
    # ensurepip 없는 venv(--without-pip) — 시스템 pip 로 그 venv 에 설치
    python3 -m pip --python "$CHEMIP_VENV/bin/python" install "${cache_opt[@]}" --disable-pip-version-check -q "$@"
  fi
}

setup_venv() {
  local kit="$CHEMIP_APP/deploy/linux" want stamp="$CHEMIP_VENV/.requirements.sha256"
  [[ -f "$CHEMIP_APP/requirements.txt" ]] || die "$CHEMIP_APP/requirements.txt 가 없습니다(code.tar 를 먼저 올리십시오)."
  if [[ ! -x "$CHEMIP_VENV/bin/python" ]]; then
    log "Python venv 생성: $CHEMIP_VENV"
    python3 -m venv "$CHEMIP_VENV"
  fi
  want="$( (cat "$CHEMIP_APP/requirements.txt" "$kit/requirements-server.txt"; echo "skip=$CHEMIP_PIP_SKIP") \
    | sha256sum | cut -d' ' -f1)"
  if [[ -f "$stamp" && "$(cat "$stamp")" == "$want" ]]; then
    log "Python 패키지 변동 없음 — pip 건너뜀"
    return
  fi
  log "Python 패키지 설치(requirements.txt − [$CHEMIP_PIP_SKIP] + requirements-server.txt)"
  local filtered pkg
  filtered="$(mktemp)"
  cp "$CHEMIP_APP/requirements.txt" "$filtered"
  for pkg in $CHEMIP_PIP_SKIP; do
    sed -i -E "/^[[:space:]]*${pkg}[[:space:]]*([=<>!~;[]|$)/Id" "$filtered"
  done
  pip_install -r "$filtered" -r "$kit/requirements-server.txt"
  rm -f "$filtered"
  echo "$want" >"$stamp"
}

build_frontend() {
  local fe="$CHEMIP_APP/frontend" want stamp="$CHEMIP_APP/frontend/node_modules/.lock.sha256"
  (( DO_FRONTEND )) || { log "프론트엔드 건너뜀(--no-frontend)"; return; }
  want="$(sha256sum "$fe/package-lock.json" | cut -d' ' -f1)"
  if [[ ! -f "$stamp" || "$(cat "$stamp")" != "$want" ]]; then
    log "npm ci (package-lock 변경 또는 첫 설치)"
    (cd "$fe" && as_app env npm_config_cache="$CHEMIP_ROOT/.npm" npm ci --no-audit --no-fund)
    as_app sh -c "echo '$want' > '$stamp'"
    CODE_CHANGED=1
  fi
  if (( CODE_CHANGED )) || [[ ! -f "$fe/.next/BUILD_ID" ]]; then
    log "next build (BACKEND_ORIGIN=http://127.0.0.1:$CHEMIP_BACKEND_PORT 로 /api 넘김 고정)"
    (cd "$fe" && as_app env BACKEND_ORIGIN="http://127.0.0.1:$CHEMIP_BACKEND_PORT" \
      NEXT_TELEMETRY_DISABLED=1 npm_config_cache="$CHEMIP_ROOT/.npm" npm run build)
  else
    log "프론트엔드 코드 변동 없음 — 빌드 건너뜀"
  fi
}

install_units() {
  local kit="$CHEMIP_APP/deploy/linux" u
  (( USE_SYSTEMD )) || { log "systemd 건너뜀(--no-systemd)"; return; }
  for u in chemip-backend.service chemip-frontend.service; do
    install -m 0644 "$kit/$u" "/etc/systemd/system/$u"
  done
  systemctl daemon-reload
  systemctl enable chemip-backend.service chemip-frontend.service >/dev/null
  log "서비스 재시작"
  systemctl restart chemip-backend.service
  (( DO_FRONTEND )) && systemctl restart chemip-frontend.service
  return 0
}

run_verify() {
  (( DO_VERIFY )) || { log "검증 건너뜀(--no-verify)"; return; }
  if (( DO_FRONTEND )); then
    bash "$CHEMIP_APP/deploy/linux/verify.sh"
  else
    FRONTEND_URL=skip bash "$CHEMIP_APP/deploy/linux/verify.sh"
  fi
}

main() {
  parse_args "$@"
  install_code
  install_data
  fix_permissions
  setup_venv
  build_frontend
  install_units
  run_verify
  log "완료 (코드 갱신=$CODE_CHANGED, 자료 갱신=$DATA_INCOMING)"
}

main "$@"
