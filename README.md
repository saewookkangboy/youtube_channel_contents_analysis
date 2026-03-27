# 채널인사이트 — 유튜브 채널·영상 콘텐츠 분석

**채널인사이트**는 YouTube 채널 또는 개별 영상 URL을 입력하면 **Google Gemini** 기반으로 한국어 전략 리포트를 생성하는 웹 앱입니다. 선택적으로 **YouTube Data API**로 수집한 실시간 메타데이터(조회수, 구독자, 최근 영상 등)를 분석에 반영할 수 있습니다.

## 서비스 개요

- **채널 분석**: 채널 성장, 콘텐츠 포지셔닝, SEO·알고리즘 관점의 실행형 제안을 마크다운 형식으로 제공합니다.
- **영상 분석**: 단일 영상의 성과 해석, 제목·설명란·해시태그 제안, 타임스탬프 구조 등 실무에 바로 옮길 수 있는 섹션으로 구성됩니다.
- **데이터 연동**: `VITE_YOUTUBE_API_KEY`가 있으면 API 팩트를 우선 사용하고, 없거나 실패 시 Gemini 검색·추론 경로로 보완합니다.

채널인사이트는 **구독자 성장**, **조회·유지 개선**, **수익화**(광고·쇼츠·제휴 등)를 동시에 다루는 전략 리포트를 목표로 합니다. 알고리즘 관점에서는 단기 조회수보다 **장기 시청자 만족도**(클릭 이후 시청 경험·재방문)를 우선하는 해석을 따릅니다. 세부 원칙·백로그는 루트의 `Agent.md`와 동일합니다.

## 제품 목표와 지표

| 구분 | 내용 |
| --- | --- |
| **North Star** | 조회수 → 시청 유지 → 구독 → 재방문 → 수익화 선순환 강화 |
| **채널 분석** | 월간 구독자 순증, 재방문 시청자 비중, 포맷별(롱폼·쇼츠) 역할 분담 |
| **영상 분석** | 업로드 초기 24시간 CTR, 초반 이탈·30초 훅, 평균 시청 지속시간 |
| **KR 예시** | Home/Suggested 24시간 CTR·30초 유지율·구독 전환율·쇼츠→롱폼 전환을 기준선 대비 추적 |

제품 측 KPI(활성 사용자, 전환, 이탈, 성능)와 채널 KPI(CTR, 시청 유지, 구독 전환)는 `Agent.md`의 **KPI 권장 세트**·**2026 성장 목표 체계**와 맞춥니다.

## 팀 문서 (에이전트 · 오케스트레이션)

| 파일 | 용도 |
| --- | --- |
| [`Agent.md`](./Agent.md) | 오케스트레이션 구조, R&R, 성장 목표, 알고리즘 반영 원칙, **기능 업데이트 우선순위(P0~P2)**, 리포트 섹션 표준 |
| [`Skill.md`](./Skill.md) | 다중 에이전트 실행 원칙, 채널/단일 영상 분석 모드, 의사결정 스코어카드, 정책 체크리스트 |
| [`AgentPromptTemplates.md`](./AgentPromptTemplates.md) | 역할별 프롬프트·패킷 작성 시 참고 |

## 제품 로드맵 (요약)

`Agent.md` **기능 업데이트 우선순위**와 동일한 백로그입니다. 구현 시 해당 문서의 세부 항목을 기준으로 합니다.

- **P0**: 초기 24시간 진단 섹션, 만족도 중심 진단(제목·썸네일·오프닝 정합성), 7일 액션 플랜을 실험 스펙(가설·지표·판정)으로 표준화
- **P1**: 쇼츠 수익화 체크리스트, 시청자 확장(구독자 vs 신규) 블록, 제목 검색형/흥미형 2트랙
- **P2**: 리포트 품질 점수화, 의사결정 로그와 성과 회고 연계 강화

공식 가이드 근거는 [추천 시스템](https://support.google.com/youtube/answer/16533387), [썸네일·제목 팁](https://support.google.com/youtube/answer/12340300), [쇼츠 수익화 정책](https://support.google.com/youtube/answer/12504220) 등 YouTube Help 문서와 `Agent.md`의 **공식 레퍼런스** 섹션을 함께 따릅니다.

## 주요 기능

| 구분 | 설명 |
| --- | --- |
| **채널 / 영상 탭** | 한 화면에서 채널 단위와 영상 단위 분석을 전환합니다. |
| **구조화 리포트** | 고정된 마크다운 섹션·표·7일 액션 플랜 등 일관된 보고서 형식을 유지합니다. |
| **알고리즘 인사이트** | 신호등(green / yellow / red) 형태로 핵심 지표 요약을 표시합니다. |
| **근거 링크** | 모델이 참조한 출처(sources)를 UI에 노출합니다. |
| **마크다운 렌더링** | `react-markdown` + GFM으로 본문을 읽기 쉽게 표시합니다. |
| **내보내기** | 분석 결과를 `.md` 파일(`유튜브_채널_분석.md` / `유튜브_영상_분석.md`)로 저장하거나, 웹 페이지 형태로 새 창에서 열어볼 수 있습니다. |
| **통계 차트** | 채널 탭에서 Recharts 기반 요약 차트를 제공합니다(데이터가 있을 때). |

## 프로젝트 구조

```text
youtube_channel_contents_analysis/
├── src/
│   ├── App.tsx                 # 라우팅 없는 단일 화면, 탭·분석·다운로드 흐름
│   ├── main.tsx
│   ├── components/
│   │   └── AnalysisMarkdown.tsx   # 리포트 마크다운 렌더링
│   ├── lib/
│   │   ├── cn.ts                  # className 유틸
│   │   ├── reportCompleteness.ts # 리포트 섹션·GFM 표 등 완성도 검사
│   │   └── wrapReportDocumentHtml.ts # 웹 페이지로 보기용 HTML 래퍼
│   └── services/
│       ├── geminiService.ts      # Gemini 호출, 프롬프트·구조화 규칙
│       └── youtubeApiService.ts # YouTube Data API 클라이언트
├── vite.config.ts
├── package.json
└── .env.example
```

## 기술 스택 · 개발 언어

- **언어**: TypeScript
- **UI**: React 19, Tailwind CSS 4, Motion, Lucide React
- **빌드**: Vite 6
- **AI**: `@google/genai` (Gemini)
- **콘텐츠**: `react-markdown`, `remark-gfm`
- **차트**: Recharts

## 로컬 실행

**필수**: [Node.js](https://nodejs.org/) (npm 사용)

1. 의존성 설치  
   `npm install`

2. 환경 변수 설정  
   프로젝트 루트에 `.env` 또는 `.env.local`을 만들고 `.env.example`을 참고해 값을 넣습니다.

   | 변수 | 필수 | 설명 |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | 예 | Gemini API 키 (빌드 시 `vite.config`의 `define`으로 주입) |
   | `VITE_YOUTUBE_API_KEY` | 아니오 | 채널/영상 팩트 데이터를 YouTube Data API에서 가져올 때 사용 |
   | `APP_URL` | 아니오 | 호스트 URL (배포·자기 참조 링크 등에 사용 가능) |

3. 개발 서버 실행  
   `npm run dev`  
   기본적으로 `http://localhost:3000` 에서 동작합니다(`package.json`의 `dev` 스크립트 기준).

4. 기타 스크립트  
   - `npm run build` — 프로덕션 빌드  
   - `npm run preview` — 빌드 결과 미리보기  
   - `npm run lint` — TypeScript 타입 검사 (`tsc --noEmit`)

## 저작권 · 라이선스

채널인사이트 애플리케이션 소스의 일부 파일(예: `src/App.tsx`)에는 **Apache License 2.0**(`SPDX-License-Identifier: Apache-2.0`) 표기가 포함되어 있습니다. 저장소 루트에 별도의 `LICENSE` 파일이 없다면, 배포·재사용 시 해당 SPDX 주석이 있는 파일의 라이선스 조건을 따르고, 필요하면 프로젝트 전체에 맞는 `LICENSE` 파일을 추가하는 것을 권장합니다.

YouTube·Google 관련 상표와 API 이용은 각 사의 이용약관 및 정책을 준수해야 합니다.
