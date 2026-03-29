# 채널인사이트 — 유튜브 채널·영상 콘텐츠 분석

YouTube **채널** 또는 **영상** URL을 넣으면 AI가 **실행 가능한 전략 리포트**(마크다운)를 만들어 줍니다.  
**`GEMINI_API_KEY`가 있으면 메인 리포트는 항상 Gemini**로 생성하고, **키가 없을 때만** **`OPENAI_API_KEY`**로 대체합니다(OpenAI는 보조·폴백). 선택적으로 **YouTube Data API**로 조회수·구독자 등 **팩트**를 붙여 할루시네이션을 줄입니다.

---

## 핵심 기능

### 분석·리포트

- **채널 / 영상** 두 모드를 한 화면에서 전환해 각각 심층 분석을 실행합니다.
- 리포트는 **고정된 목차**를 따릅니다. 예: **팩트 체크**, **초기 24시간 진단**, **만족도 중심 진단 카드**, **7일 액션 플랜**(일차별 상세), **알고리즘·SEO 체크리스트 표**, **쇼츠 아이디어**, **마케터·PD 역할별 인사이트**, 썸네일용 **이미지 생성 프롬프트** 등(영상 리포트 기준).
- **한국어 / 영어**: UI 전환과 함께 리포트 본문·헤딩 언어도 맞출 수 있습니다.

### 데이터·신뢰도

- **YouTube Data API**(`VITE_YOUTUBE_API_KEY`)로 메타·통계를 가져오면 **FACT_PACKET**(짧은 키 JSON)으로 압축해 프롬프트에 넣고, 리포트 **`## 0` 팩트**에는 API 수치를 **원문 그대로** 쓰도록 요구합니다. 이후 본문의 동일 지표는 FACT_PACKET과 **반드시 일치**해야 합니다(임의 반올림·변형 금지).
- **ANALYTICS_PACKET**: 팩트에서만 계산한 **파생 지표**(참여·좋아요·댓글률, 최근 대비 평균 조회 등)를 별도 압축 블록으로 넣어, 모델이 같은 계산을 반복하지 않도록 하고 토큰·일관성을 맞춥니다(`src/lib/dataAnalysis.ts` 등).
- **수집 단계 병렬**: `runCollectPhaseInParallel`에서 **YouTube 팩트 fetch**와 **분석 준비**(개발 시 오케스트레이션 접미사 프리패치)를 `Promise.all`로 동시에 돌립니다. 정제 단계에서는 필요 시 **임베딩**과 **남은 dev 접미사 로드**를 또 한 번 병렬로 겹칩니다(`src/lib/analysisCollectParallel.ts`, `analysisPipeline.ts` 주석).
- **팩트 전용 모드**(API로 raw를 확보했을 때만): 웹 검색·도구를 끄고 팩트 중심으로 쓰도록 유도합니다.
- **이중 팩트 검증**: 메인 리포트 생성 후, 설정된 키가 있으면 **OpenAI**와 **Gemini**가 **병렬**로 주장을 점검하고, UI에 요약·리스크·플래그 항목을 보여 줍니다(기본 검증 모델은 `.env.example` 참고).
- 모델이 쓴 **웹 근거 링크**를 모아 보여 주고, **필수 섹션·표 누락**은 완성도 힌트로 안내합니다.

### 결과 활용·운영

- 리포트를 **마크다운 파일**로 저장하거나, **브라우저 새 창**에서 읽기 좋은 웹 문서로 열 수 있습니다.
- **알고리즘 인사이트**를 신호등(녹/황/적)으로 요약해 한눈에 봅니다.
- 채널 모드에서 데이터가 있으면 **요약 차트**를 표시합니다.
- 분석 중 **취소**가 가능하고, 할당량·인증·네트워크 오류는 **구분된 안내 문구**로 표시합니다.
- **토큰·(가능 시) 추정 비용**을 세션 단위로 확인할 수 있습니다(Gemini 기준 단가 추정은 [ai-cost-calc](https://github.com/saewookkangboy/ai-cost-calc) 스타일).

### 개발 전용

- **`VITE_DEV_AGENT_ORCHESTRATION=1`**(로컬만): 분석 프롬프트에 dev-agent-kit 스타일 **오케스트레이션 접미사**를 붙입니다(토큰 소량 추가). 프로덕션 빌드에는 해당 동적 청크가 넣어지지 않습니다.
- 화면 우하단 **Dev Agent Kit** 패널(`import.meta.env.DEV`에서만): 오케스트레이터 역할 카드·분석 **강화학습 에피소드** 요약 등을 확인합니다.

---

## Harness Engineering 관점의 적용

이 저장소는 **Harness** 등 SRE·배달 플랫폼에서 쓰는 **안정적 배달·품질 게이트** 아이디어를, 브라우저 SPA와 GitHub CI에 맞게 **축소·이식**한 부분이 있습니다. (Harness 제품을 직접 연동한 것은 아니며, **문서·코드 주석에 명시된 설계 철학**을 따릅니다.)

- **일시적 장애 대응(런타임)**: `src/lib/resilience.ts` 주석대로, Harness/SRE 계열에서 권장하는 **지수 백오프 + 지터(jitter)**·**상한(cap)** 있는 대기로 네트워크·429·5xx 등 **일시적 실패**를 흡수합니다.
- **재시도 경계**: 사용자 **취소(`AbortSignal`)** 는 재시도하지 않고, `sleep` 대기도 즉시 끊습니다. 인증·권한·잘못된 요청 등 **비일시적 4xx**는 재시도 대상에서 제외하는 식으로 **재시도 가능 여부를 구분**합니다.
- **공통 래퍼**: `withRetry`로 OpenAI·Gemini **리포트 생성·검증** 등 비동기 호출을 감싸고, `resilientFetch`로 **YouTube Data API**용 `fetch`를 감쌉니다.
- **파이프라인 서술**: `src/lib/analysisPipeline.ts`에서 위 회복력을 **외부 API 경로의 배달 안정성** 원칙으로 설명하고, 수집→정제→리포트→검증 흐름과 함께 적습니다.
- **CI 품질 게이트**: `.github/workflows/ci.yml` 주석대로 **Harness식 배달 파이프라인의 검증 단계**를 최소 형태로 옮겨, `lint`(타입체크)·**단위 테스트**·**Playwright E2E**·(선택) **`npm audit`**·**빌드**를 푸시/PR마다 실행합니다.

---

## 빠른 시작

- **요구**: Node.js **20+**, npm  
- **설치**: `npm install`  
- **실행**: `npm run dev` → 기본 `http://localhost:3000`

환경 변수는 **`.env.example`**을 복사해 채웁니다.

| 변수 | 설명 |
| --- | --- |
| `GEMINI_API_KEY` | 메인 리포트 생성 **우선**(Gemini) |
| `OPENAI_API_KEY` | **Gemini 키가 없을 때만** 메인 리포트에 사용(기본 모델 `gpt-5.4-nano`, `OPENAI_REPORT_MODEL`로 변경 가능). 둘 다 있으면 **후단 팩트 검증** 등 보조에 참여 |
| `OPENAI_VERIFY_MODEL` / `GEMINI_VERIFY_MODEL` | 이중 팩트 검증용(선택, 미설정 시 기본값) |
| `VITE_YOUTUBE_API_KEY` | YouTube 팩트·팩트 전용 모드(선택) |
| `APP_URL` | 호스트 URL(선택) |
| `VITE_DEV_AGENT_ORCHESTRATION` | `1`이면 로컬에서만 오케스트레이션 프롬프트 접미사 사용(선택) |
| `VITE_E2E_REPORT_PREVIEW` | E2E·프리뷰 빌드에서 `?reportPreview=` 고정 마크다운 허용 시 `1`(선택) |

**스크립트**: `npm run build` · `npm run preview` · `npm run lint` · `npm test`(Vitest) · `npm run test:e2e`(Playwright, 사전 `npm run test:e2e:install`)

**테스트**: `tests/analysisPipelineLlmPreference.test.ts` 등에서 **메인 리포트 LLM 우선순위**(Gemini 키가 있으면 OpenAI 폴백 미사용)를 검증합니다.

**보안**: API 키는 현재 **프런트 번들에 포함**됩니다. 공개 배포·Vercel Preview에는 **별도 제한 키**와 쿼터 관리를 권장합니다.

---

## 기술 스택

TypeScript, React 19, Vite, Tailwind CSS 4, Motion, Recharts, `react-markdown`, **OpenAI**(Chat Completions), **Google GenAI**(Gemini·`text-embedding-004`), **Vitest**, **Playwright**.

---

## Vercel 배포

[`vercel.json`](./vercel.json) 기준으로 Vite `dist`를 배포합니다. 프로젝트 환경 변수에 위 키들을 넣고, Preview/Production에 **키를 분리**해 두면 안전합니다. 변수 변경 후 필요 시 **Redeploy** 하세요.

---

## 라이선스

일부 소스(예: `src/App.tsx`)에 **Apache-2.0**(`SPDX-License-Identifier: Apache-2.0`) 표기가 있습니다. YouTube·Google·OpenAI API 이용은 각 제공자 약관을 따릅니다.
