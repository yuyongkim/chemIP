# Weekly Top 15 Execution

| # | 이번 주 실행 스텝 | 우선순위 | 난이도 | 효과 | 상태 |
|---:|---|---|---|---|---|
| 1 | 프론트 공통 안전 API 유틸 추가 (`fetchJsonSafe`) | P0 | M | H | 완료 |
| 2 | 공통 에러 메시지 해석 유틸 추가 (`getErrorMessage`) | P0 | L | H | 완료 |
| 3 | `home/utils.ts`를 공통 안전 유틸 기반으로 전환 | P0 | L | H | 완료 |
| 4 | `SearchBar.tsx` 자동완성 API 안전 파싱 적용 | P0 | L | H | 완료 |
| 5 | `AIAnalysisSection.tsx` 안전 파싱 + 에러 표준 처리 | P0 | M | H | 완료 |
| 6 | `useDrugSearch.ts` 3개 API 호출 안전 파싱 통일 | P0 | M | H | 완료 |
| 7 | `useChemicalDetail.ts` 상세 조회 안전 파싱 적용 | P0 | L | H | 완료 |
| 8 | `chemical/[id]/bilingual/page.tsx` 안전 파싱 적용 | P0 | L | H | 완료 |
| 9 | `usePatentSearch.ts` 안전 파싱 + 표준 에러 처리 | P0 | M | H | 완료 |
| 10 | 프론트 `res.json()` 직접 파싱 지점 전수 제거 | P0 | M | H | 완료 |
| 11 | 백엔드 글로벌 예외 응답 스키마 표준화 | P0 | L | H | 완료 |
| 12 | 백엔드 `/health` 엔드포인트 추가 | P0 | L | H | 완료 |
| 13 | 백엔드 `/ready` 엔드포인트 추가 | P0 | L | H | 완료 |
| 14 | 100개 우선순위 매트릭스 문서화 | P0 | M | H | 완료 |
| 15 | README에 운영 체크포인트 및 문서 링크 업데이트 | P1 | L | M | 완료 |

## Validation

- Frontend build: `npm run build` (in `frontend`)
- Health check: `GET /health`
- Readiness check: `GET /ready`
