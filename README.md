# 채널인사이트 — 유튜브 채널·영상 콘텐츠 분석

**채널인사이트**는 YouTube 채널 또는 개별 영상 URL을 입력하면 **Google Gemini** 기반으로 전략 리포트를 생성하는 웹 앱입니다. 선택적으로 **YouTube Data API**로 수집한 실시간 메타데이터(조회수, 구독자, 최근 영상 등)를 분석에 반영할 수 있습니다.

## 서비스 개요

- **채널 / 영상 분석**: 성장·콘텐츠·SEO·알고리즘 관점의 실행형 제안을 마크다운으로 제공합니다. 필수 섹션에는 **초기 24시간 성과 진단**, **만족도 중심 진단 카드**, **7일 액션 플랜**(일차별 `###` 소제목·4요소 불릿) 등이 포함됩니다. 영상 리포트에는 **알고리즘·SEO 체크리스트 표**, **쇼츠 파생 아이디어**, **마케터·PD 역할별 인사이트**, 썸네일용 **이미지 생성 프롬프트(Nano Banana Pro)** 등 확장 섹션이 프롬프트에 정의되어 있습니다.
- **UI·리포트 언어**: 인터페이스는 **한국어 / 영어** 전환(`localStorage` 유지)을 지원하고, Gemini 호출 시 **출력 로케일(`ko` / `en`)**에 맞춰 본문·헤딩·알고리즘 인사이트 JSON 라벨 언어를 맞춥니다.
- **데이터 연동**: `VITE_YOUTUBE_API_KEY`가 있으면 API 팩트를 우선 사용합니다. **팩트 전용 모드**는 API로 raw 데이터를 확보한 경우에만 선택 가능하며, 켜면 웹 검색·URL 컨텍스트 도구를 끄고 팩트 기반 분석에 집중합니다. 키가 없거나 팩트가 없으면 자동으로 웹 도구 경로로 보완합니다.

채널인사이트는 **구독자 성장**, **조회·유지 개선**, **수익화**(광고·쇼츠·제휴 등)를 함께 다루는 리포트를 목표로 하며, 알고리즘 해석에서는 단기 조회수보다 **장기 시청자 만족도**(클릭 이후 시청 경험·재방문)를 우선합니다.

## 분석 파이프라인(시스템)

코드 기준 흐름은 `src/lib/analysisPipeline.ts` 주석과 동일합니다.

1. **수집**: URL에서 채널/영상 ID를 해석하고, 선택적으로 YouTube Data API로 메타·통계를 가져옵니다(`resilientFetch` — 일시적 HTTP 오류 대응).
2. **정제**: 팩트를 짧은 키 JSON(**FACT_PACKET**)으로 압축·트렁케이트해 LLM 입력 토큰을 줄입니다.
3. **(선택) 의미 정렬**: `text-embedding-004`로 제목·설명(또는 채널명·최근 제목) 간 코사인 유사도 힌트를 한 번에 계산해, 한국어 SEO 문장이 원문 주제에서 벗어나지 않도록 프롬프트에 주입합니다(`src/lib/koreanSemanticEmbedding.ts`). 임베딩 호출에도 재시도가 적용됩니다.
4. **분석·리포트**: Gemini **단일 호출**로 마크다운 리포트 + UI용 `algorithmInsights` JSON을 생성합니다(`src/services/geminiService.ts`). 프롬프트는 본문 섹션을 `##` 한 줄 헤딩으로 시작하도록 고정해 `reportCompleteness` 검사와 맞춥니다.

**회복력**: YouTube·Gemini `generateContent`·임베딩 경로는 `src/lib/resilience.ts`의 **지수 백오프 + 지터 재시도**로 429·5xx·네트워크 등 일시적 실패를 흡수합니다. 사용자 **취소(`AbortSignal`)** 시 재시도·대기는 즉시 중단됩니다.

**모델 선택(현재 코드)**  
- **채널 분석**: `gemini-3-flash-preview`  
- **영상 분석**: `gemini-3.1-pro-preview`  

응답이 **출력 토큰 상한**에 도달하면 로케일별 안내 문구를 리포트에 덧붙여, 7일 플랜·표·JSON 블록 등이 잘렸을 수 있음을 알립니다.

클라이언트 싱글톤은 `src/services/geminiClient.ts`에서 관리하며, `GEMINI_API_KEY` 미설정 시 명확한 오류를 냅니다.

## 제품 목표와 지표(요약)

| 구분 | 내용 |
| --- | --- |
| **North Star** | 조회수 → 시청 유지 → 구독 → 재방문 → 수익화 선순환 강화 |
| **채널 분석** | 월간 구독자 순증, 재방문 시청자 비중, 포맷별(롱폼·쇼츠) 역할 분담 |
| **영상 분석** | 업로드 초기 24시간 CTR, 초반 이탈·30초 훅, 평균 시청 지속시간 |
| **KR 예시** | Home/Suggested 24시간 CTR·30초 유지율·구독 전환율·쇼츠→롱폼 전환을 기준선 대비 추적 |

공식 가이드 근거는 [추천 시스템](https://support.google.com/youtube/answer/16533387), [썸네일·제목 팁](https://support.google.com/youtube/answer/12340300), [쇼츠 수익화 정책](https://support.google.com/youtube/answer/12504220) 등 YouTube Help를 참고합니다.

## 제품 로드맵(요약)

- **P0**: 초기 24시간 진단·만족도 중심 진단·7일 액션 플랜을 실험 스펙(가설·지표·판정)으로 표준화 — 리포트 규칙과 완성도 검사에 반영됨.
- **P1**: 쇼츠 수익화 체크리스트, 시청자 확장(구독자 vs 신규) 블록, 제목 검색형/흥미형 2트랙.
- **P2**: 리포트 품질 점수화 고도화, 의사결정 로그와 성과 회고 연계.

## 주요 기능

| 구분 | 설명 |
| --- | --- |
| **채널 / 영상 탭** | 한 화면에서 채널 단위와 영상 단위 분석을 전환합니다. |
| **한/영 UI** | `I18nProvider` + `translations.ts`; `document.documentElement.lang` 동기화. |
| **구조화 리포트** | 로케일별 최소 섹션 수·고정 헤딩·GFM 표·7일 플랜 형식을 프롬프트로 강제합니다. |
| **팩트 전용 모드** | YouTube API 키가 있을 때만 노출; API 팩트 확보 시 웹 도구를 끕니다. |
| **알고리즘 인사이트** | 응답 말미 JSON 블록으로 `green` / `yellow` / `red` 신호등을 UI에 표시합니다. |
| **근거 링크** | 모델이 참조한 출처(sources)를 UI에 노출합니다. |
| **마크다운 렌더링** | `react-markdown` + GFM. |
| **리포트 완성도 힌트** | `reportCompleteness.ts`로 필수 섹션 누락·알고리즘/SEO 표·체크리스트 열 누락을 검사해 UI에 안내합니다. |
| **Gemini 사용량·추정 비용** | `geminiApiUsage.ts`로 토큰 메타데이터 기반 추정(모델별 단가 테이블); `GeminiUsageCard`에 마지막 요청·세션 누적을 표시합니다. |
| **보내기** | `.md` 파일(`유튜브_채널_분석.md` / `유튜브_영상_분석.md`) 저장, 웹 페이지로 새 창 보기(`wrapReportDocumentHtml.ts`). |
| **통계 차트** | 채널 탭에서 Recharts 기반 요약 차트(데이터가 있을 때). |
| **마크다운 가독성** | `AnalysisMarkdown`에서 스크롤 기반 페이드 인(Motion); `prefers-reduced-motion`이면 애니메이션을 생략합니다. |
| **분석 취소** | 진행 중인 YouTube·Gemini·임베딩 요청에 `AbortSignal`을 연결하고, UI에서 취소할 수 있습니다. |
| **일시 오류 재시도** | `resilience.ts` — Gemini·YouTube·임베딩에 백오프 재시도(사용자 취소 제외). |
| **오류 안내** | 429·401/403·5xx·네트워크 등을 구분해 `translations` 기반 메시지로 표시합니다(`analysisErrors.ts`). |

## 프로젝트 구조

```text
youtube_channel_contents_analysis/
├── metadata.json              # 앱 표시용 메타(이름·설명 등)
├── src/
│   ├── App.tsx                # 탭·분석·팩트 모드·완성도·다운로드·취소
│   ├── main.tsx               # I18nProvider 래핑
│   ├── index.css
│   ├── dev/
│   │   └── reportPreviewFixtures.ts  # ?reportPreview=… 데모용 샘플 마크다운
│   ├── i18n/
│   │   ├── I18nContext.tsx
│   │   ├── translations.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── AnalysisMarkdown.tsx
│   │   └── GeminiUsageCard.tsx
│   ├── lib/
│   │   ├── analysisErrors.ts      # API 오류 종류 → i18n 키
│   │   ├── analysisPipeline.ts    # FACT_PACKET·파이프라인 버전
│   │   ├── cn.ts
│   │   ├── resilience.ts          # 재시도·백오프·resilient fetch
│   │   ├── geminiApiUsage.ts      # 토큰·추정 비용
│   │   ├── koreanSemanticEmbedding.ts
│   │   ├── reportCompleteness.ts
│   │   └── wrapReportDocumentHtml.ts
│   └── services/
│       ├── geminiClient.ts
│       ├── geminiService.ts
│       └── youtubeApiService.ts
├── vite.config.ts
├── vercel.json
├── package.json
└── .env.example
```

## 기술 스택 · 개발 언어

- **언어**: TypeScript
- **런타임 요구**: Node.js **20 이상**(`package.json` `engines`)
- **UI**: React 19, Tailwind CSS 4, Motion, Lucide React
- **빌드**: Vite 6
- **AI**: `@google/genai` — 채널 리포트 **Gemini 3 Flash**(`gemini-3-flash-preview`), 영상 리포트 **Gemini 3.1 Pro**(`gemini-3.1-pro-preview`), 임베딩 **text-embedding-004**
- **콘텐츠**: `react-markdown`, `remark-gfm`
- **차트**: Recharts

`package.json`에 `express`, `dotenv`, `tsx`가 포함되어 있으나, 현재 npm 스크립트는 Vite 기반 `dev` / `build` / `preview`만 사용합니다. 별도 API 서버를 붙일 때 활용할 수 있습니다.

## 로컬 실행

**필수**: [Node.js](https://nodejs.org/) 20+ (npm)

1. 의존성 설치  
   `npm install`

2. 환경 변수 설정  
   프로젝트 루트에 `.env` 또는 `.env.local`을 만들고 `.env.example`을 참고합니다.

   | 변수 | 필수 | 설명 |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | 예 | Gemini API 키(빌드 시 `vite.config` `define`으로 주입) |
   | `VITE_YOUTUBE_API_KEY` | 아니오 | YouTube Data API — 팩트 수집·팩트 전용 모드 |
   | `APP_URL` | 아니오 | 호스트 URL(배포·자기 참조 등) |

3. 개발 서버 실행  
   `npm run dev`  
   기본: `http://localhost:3000` (`package.json`의 `dev` 스크립트).

4. 기타 스크립트  
   - `npm run build` — 프로덕션 빌드  
   - `npm run preview` — 빌드 미리보기  
   - `npm run lint` — TypeScript 검사 (`tsc --noEmit`)

### UI·완성도 미리보기(개발)

API 키 없이 레이아웃·`reportCompleteness`·마크다운 스타일을 보려면 개발 서버에서 쿼리 파라미터를 사용합니다.

| URL 예시 | 동작 |
| --- | --- |
| `?reportPreview=channel` | 채널 탭에 샘플 리포트 로드 |
| `?reportPreview=video` | 영상 탭에 샘플 리포트 로드 |
| `?reportPreview=both` | 채널·영상 샘플을 각 탭에 로드 |

샘플 본문은 `src/dev/reportPreviewFixtures.ts`에 정의되어 있으며, 예상 헤딩 구조를 맞춰 완성도 검사를 통과하도록 구성되어 있습니다.

## Vercel 배포

[`vercel.json`](./vercel.json)은 Vite 빌드 산출물(`dist`)과 SPA 리라이트를 지정합니다.

1. 저장소를 Vercel에 연결하고 **Root Directory**는 저장소 루트로 둡니다.  
2. **Environment Variables**에서 환경 범위를 나눕니다.  
   - **Production**: 운영용 `GEMINI_API_KEY`, 필요 시 `VITE_YOUTUBE_API_KEY`.  
   - **Preview**(PR·브랜치 프리뷰): 동일 변수명으로 **별도 키**를 두면 쿼터·유출 피해를 운영과 분리할 수 있습니다(개발 전용 Gemini/YouTube 키 권장).  
   - 변수는 브랜치별 Preview에도 동일하게 주입되므로, 민감 키는 팀 정책에 맞게 Preview 전용 키만 넣는 방식을 권장합니다.  
3. 키 변경 후에는 **Redeploy**(캐시 없이 재빌드)가 필요할 수 있습니다.

**보안 참고**: `GEMINI_API_KEY`는 현재 구조상 프런트 번들에 포함됩니다. 공개 배포·프리뷰 URL에서는 키 회전·쿼터 제한·가능하면 서버 프록시를 검토하세요.

## 저작권 · 라이선스

애플리케이션 소스의 일부 파일(예: `src/App.tsx`)에는 **Apache License 2.0**(`SPDX-License-Identifier: Apache-2.0`) 표기가 있습니다. 루트에 `LICENSE`가 없다면 해당 SPDX가 있는 파일의 조건을 따르고, 필요 시 프로젝트 전체용 `LICENSE`를 추가하는 것을 권장합니다.

YouTube·Google 관련 상표와 API 이용은 각 사의 이용약관 및 정책을 준수해야 합니다.
