// HAZOP 워크시트 보관 — 이 브라우저의 localStorage(HAZOP_STORE_KEY)에만. 서버로 보내지 않는다.
// 읽기·쓰기는 모두 try/catch: 개인 정보 보호 모드·차단된 저장소에서도 화면은 그대로 동작하고, 저장 실패만 알린다(saved = false).

function hzLoadStudy() {
  try {
    const raw = localStorage.getItem(HAZOP_STORE_KEY);
    return hzNormalizeStudy(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return hzNormalizeStudy(null);
  }
}

function hzSaveStudy(study) {
  try {
    localStorage.setItem(HAZOP_STORE_KEY, JSON.stringify(study));
    return true;
  } catch (e) {
    return false;
  }
}

// [study, setStudy(updater | 값), saved] — 고친 뒤 0.4 초 쉬면 저장한다
function useHazopStudy() {
  const [study, setStudy] = React.useState(hzLoadStudy);
  const [saved, setSaved] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setSaved(hzSaveStudy(study)), 400);
    return () => clearTimeout(t);
  }, [study]);
  return [study, setStudy, saved];
}

Object.assign(window, { hzLoadStudy, hzSaveStudy, useHazopStudy });
