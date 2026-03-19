# ChemIP Platform 개념도 (Mermaid)

## 1) 서비스 개념도
```mermaid
flowchart LR
    U[사용자/담당자] --> F[Frontend<br/>Next.js]
    F --> B[Backend API<br/>FastAPI]

    B --> K[KOSHA API<br/>MSDS]
    B --> P[KIPRIS/Global Patent APIs]
    B --> T[KOTRA/Naver APIs]

    B --> D1[(SQLite<br/>terminology.db)]
    B --> D2[(SQLite<br/>global_patent_index.db)]

    B --> R[통합 결과<br/>사전 스크리닝 화면]
    R --> U
```

## 2) 업무 활용 흐름도 (공무원 제출용)
```mermaid
flowchart TD
    A[민원/검토 요청 접수] --> B[대상 물질 검색]
    B --> C1[안전정보 확인]
    B --> C2[특허 리스크 확인]
    B --> C3[시장/진출 참고 확인]
    C1 --> D[1차 검토 의견 작성]
    C2 --> D
    C3 --> D
    D --> E[부서 협의]
    E --> F[최종 판단/회신]
    F --> G[이력 기록 및 재사용]
```

## 3) 장애 대응 개념도 (Fallback)
```mermaid
flowchart LR
    Q[조회 요청] --> API{외부 API 응답 정상?}
    API -- 예 --> N[정상 응답 표시]
    API -- 아니오 --> L[대체 경로(fallback) 조회]
    L --> S[대체 데이터 표시 + 출처 표기]
    N --> END[업무 계속]
    S --> END[업무 계속]
```

## 활용 안내
- GitHub/Markdown 뷰어에서 Mermaid 지원 시 바로 렌더링됩니다.
- PPT 제출 시 Mermaid를 SVG/PNG로 내보내 삽입하면 선명도가 유지됩니다.
