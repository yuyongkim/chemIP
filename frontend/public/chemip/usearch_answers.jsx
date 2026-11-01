// 통합 검색 "바로 답" 등록 목록 — 묶음 위에 카드로 보이는 답. 답 하나 = 파일 하나(usearch_answer_<이름>.jsx) + 아래 배열 한 줄
// (+ index.html 스크립트 한 줄). 배열 순서 = 화면 순서. 돌리는 훅 useUnifiedAnswers(api_usearch_answers.jsx), 화면 UsAnswers.
//
// 답(answer) 형식:
//   k          답 key
//   answer(q)  → 답 객체 또는 null(이 검색어에는 답 없음), Promise 가능. 자료 요청은 api_*.jsx 함수로만 한다.
//   Component  ({ answer, query }) => 카드 하나

const USEARCH_ANSWERS = [
  USA_FACTS,
  USA_EL,
];

Object.assign(window, { USEARCH_ANSWERS });
