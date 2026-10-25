#!/usr/bin/env bash
# ChemIP 동작 확인 — 백엔드 직통, 프론트엔드(/api 넘김 포함), 선택적으로 공개 주소까지 같은 항목을 찍어 본다.
#
#   BACKEND_URL   기본 http://127.0.0.1:7011
#   FRONTEND_URL  기본 http://127.0.0.1:7000   ("skip" 이면 프론트엔드 항목 생략)
#   PUBLIC_URL    기본 없음. 예: https://chemip-staging.yule.pics  또는  https://chemip.yule.pics
#   WAIT_SECONDS  백엔드 /health 가 뜰 때까지 기다리는 최대 시간(기본 60)
#
# 실패가 하나라도 있으면 종료 코드 1.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=layout.env
source "$HERE/layout.env"

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:$CHEMIP_BACKEND_PORT}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:$CHEMIP_FRONTEND_PORT}"
PUBLIC_URL="${PUBLIC_URL:-}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

# 시험 물질: 벤젠(CAS 71-43-2, KOSHA chem_id 001008)
CAS="71-43-2"
CHEM_ID="001008"

PASS=0
FAIL=0
BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT

# check <이름> <URL> <허용 상태코드 정규식> [본문에 있어야 할 문자열]
check() {
  local name="$1" url="$2" codes="$3" needle="${4:-}" code
  code="$(curl -sS -o "$BODY" -w '%{http_code}' --max-time 40 "$url" 2>/dev/null)" || code="000"
  if [[ ! "$code" =~ ^($codes)$ ]]; then
    printf '  FAIL  %-44s HTTP %s  %s\n' "$name" "$code" "$url"
    FAIL=$((FAIL + 1))
    return
  fi
  if [[ -n "$needle" ]] && ! grep -q -- "$needle" "$BODY"; then
    printf '  FAIL  %-44s HTTP %s, 본문에 "%s" 없음\n' "$name" "$code" "$needle"
    FAIL=$((FAIL + 1))
    return
  fi
  printf '  PASS  %-44s HTTP %s\n' "$name" "$code"
  PASS=$((PASS + 1))
}

# 참고 정보(합격 여부에 넣지 않음): 본문 앞부분을 한 줄로 보여 준다
peek() {
  local name="$1" url="$2"
  curl -sS --max-time 40 "$url" 2>/dev/null | head -c 160 | tr '\n' ' ' | sed "s/^/  INFO  $name: /"
  echo
}

wait_for_backend() {
  local i
  for (( i = 0; i < WAIT_SECONDS; i += 2 )); do
    curl -fsS --max-time 3 "$BACKEND_URL/health" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

# 백엔드·프론트엔드·공개 주소 공통 API 항목
api_checks() {
  local base="$1" label="$2"
  check "$label 수출입 규제 카탈로그"            "$base/api/regulations/trade-controls-catalog" "200"
  check "$label 수출입 규제 $CAS"                "$base/api/regulations/trade-controls/$CAS" "200" "$CAS"
  check "$label 물질 검색 q=$CAS"                "$base/api/chemicals?q=$CAS" "200" "$CHEM_ID"
  check "$label 물질 상세 $CHEM_ID"              "$base/api/chemicals/$CHEM_ID" "200"
  check "$label 특허 색인(없으면 빈 목록)"       "$base/api/patents/global/$CHEM_ID?limit=5" "200" "results"
  check "$label 특허 탭 KIPRIS 검색(키 필요)"    "$base/api/patents?q=benzene&limit=1" "200" "results"
  check "$label KOSHA 가이드 상태"               "$base/api/guides/status" "200" "ready_files"
  check "$label EPC 조문(클라우드엔 미연결 응답)" "$base/api/integrations/provisions/$CAS?country=KR" "200"
  check "$label 사고 사례(없으면 미연결 응답)"   "$base/api/integrations/incidents/$CAS" "200"
}

page_checks() {
  local base="$1" label="$2"
  check "$label 첫 화면 /"                       "$base/" "200|307|308"
  check "$label 정적 앱 /chemip/index.html"      "$base/chemip/index.html" "200"
  check "$label 물질 페이지 /chemical/$CHEM_ID"  "$base/chemical/$CHEM_ID" "200"
}

main() {
  echo "== 백엔드 $BACKEND_URL"
  if ! wait_for_backend; then
    echo "  FAIL  /health 가 ${WAIT_SECONDS}초 안에 응답하지 않음"
    exit 1
  fi
  check "백엔드 /health" "$BACKEND_URL/health" "200" '"status":"ok"'
  check "백엔드 /ready"  "$BACKEND_URL/ready" "200" "ready"
  api_checks "$BACKEND_URL" "백엔드"
  peek "가이드 상태" "$BACKEND_URL/api/guides/status"
  peek "특허 색인"   "$BACKEND_URL/api/patents/global/$CHEM_ID?limit=1"

  if [[ "$FRONTEND_URL" != "skip" ]]; then
    echo "== 프론트엔드 $FRONTEND_URL"
    page_checks "$FRONTEND_URL" "프론트"
    api_checks "$FRONTEND_URL" "프론트→"
  fi

  if [[ -n "$PUBLIC_URL" ]]; then
    echo "== 공개 주소 $PUBLIC_URL"
    page_checks "$PUBLIC_URL" "공개"
    api_checks "$PUBLIC_URL" "공개→"
  fi

  echo "== 결과: PASS $PASS / FAIL $FAIL"
  (( FAIL == 0 ))
}

main "$@"
