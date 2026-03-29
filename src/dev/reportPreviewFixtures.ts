/**
 * Dev-only sample markdown: mirrors expected channel/video report headings so
 * completeness checks pass and UI (report-document + AnalysisMarkdown) can be reviewed.
 */
export const CHANNEL_REPORT_PREVIEW_MARKDOWN = `# 채널 심층 분석 (미리보기)

## 0. 🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)

FACT_PACKET 요약(데모·E2E 고정값): 아래 표 수치는 **미리보기 전용**이며 Playwright가 팩트 섹션 렌더를 검증하는 데 사용합니다.

| 팩트 키 | 값(데모) |
| --- | --- |
| sc (구독자) | 12500 |
| tv (총조회) | 340000 |
| ANALYTICS rvr | 1.25 |

## 1. 📊 채널 데이터 및 현황 분석 (Channel Data Analysis)

섹션 0과 동일 출처: 구독자 **12500**, 총조회 **340000**. ANALYTICS 파생 **rvr=1.25**를 언급합니다.

## 2. 🚀 콘텐츠 성과 분석 (Content Performance Analysis)

콘텐츠 유형별 성과와 시청 지표를 불릿으로 정리합니다.

## 3. 💰 다각화된 수익화 전략 (Advanced Monetization Strategies)

수익화 채널과 우선순위를 제시합니다.

## 4. 📈 구독자 증가를 위한 전략 (Subscriber Growth Strategy)

전환 퍼널 관점의 실행 항목입니다.

## 5. 🕒 초기 24시간 성과 진단 (First 24h Diagnostics)

CTR·초반 이탈 가설과 개선안을 구분합니다.

## 6. 🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)

**높음/보통/낮음** 체계로 패키징 정합성을 평가합니다.

## 7. 🤖 유튜브 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)

**[필수] 알고리즘 & SEO 개선 체크리스트** 예시 표:

| 최적화 항목(Optimization Item) | 현재 상태 진단(Current Status Assessment) | 구체적인 개선 방안(Specific Improvement Actions) |
| --- | --- | --- |
| 제목(Titles) | 양호 | A/B 테스트 후보 2개 |
| 설명란(Descriptions) | 보통 | 상단 2줄에 키워드 배치 |
| 태그(Tags) | 보통 | 롱테일 10개 확장 |
| 썸네일(Thumbnails) | 개선 필요 | 대비·텍스트 크기 조정 |

## 8. ✍️ 영상 제목 효율성 및 개선 제안 (Video Title Effectiveness & Suggestions)

제목 클릭 트리거와 수정 예시를 나열합니다.

## 9. 🤝 시청자 참여 및 커뮤니티 전략 (User Engagement Features)

커뮤니티 탭·댓글 운영 팁입니다.

## 10. ⏰ 최적의 업로드 시간 및 요일 제안 (Optimal Publishing Schedule)

요일·시간대 권장안을 표로 제시할 수 있습니다.

## 11. 💡 신규 콘텐츠 시리즈 아이디어 (New Content Series Ideas)

시리즈 컨셉 2~3개를 한 줄씩 요약합니다.

## 12. 🎥 영상 및 오디오 품질 개선 제안 (Video & Audio Quality Improvement)

장비·편집 관점의 실행 팁입니다.

## 13. 👀 타겟 시청자 교차 시청 채널 분석 (Audience Cross-Viewership Analysis)

유사 채널 트렌드와 벤치마킹 포인트입니다.

## 14. 📱 유튜브 쇼츠(Shorts) 연계 및 활용 전략 (Shorts Strategy)

롱폼에서 파생할 쇼츠 아이디어를 불릿으로 씁니다.

## 15. 📣 채널 분석 — 마케터·PD 심층 인사이트 (Role-Based Channel Analysis)

**마케터 (Marketer)**

- 브랜딩 메시지와 퍼널 단계별 CTA 정리
- Lesson learned: **썸네일-제목 약속 일치**가 전환에 미치는 영향

**영상 기획 및 PD (Producer / PD)**

- 다음 에피소드 각도·챕터 구성 제안

**참고 레퍼런스(벤치마킹 채널)** — Markdown 표:

| 채널명 | 공식·대표 URL | 참고 포인트 | 팩트 체크(검증 상태·근거) |
| --- | --- | --- | --- |
| 예시 크리에이터 A | https://www.youtube.com/ | 훅 리듬 | 확인됨 — 공식 채널 페이지 |

## ✅ 우선 실행 액션 플랜 (7일)

### Day 1

- [ ] 썸네일 대비 점검
- [ ] 설명란 상단 키워드 반영
- [ ] Shorts 훅 1개 시험
- [ ] 댓글 고정 질문 1개
`;

export const VIDEO_REPORT_PREVIEW_MARKDOWN = `# 영상 심층 분석 (미리보기)

## 0. 🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)

FACT_PACKET 기반 수치 인용(데모): 조회 **88200**, 좋아요 **4200**.

| 팩트 | 값(데모) |
| --- | --- |
| v (조회) | 88200 |
| er (참여율 %) | 5.2 |

## 1. 📊 영상 상세 분석 (Detailed Video Analysis)

0번과 동일: 조회 **88200**, ANALYTICS **er=5.2%** 인용.

## 2. 📝 제목 및 설명란 추천 (Title & Description Recommendations)

제목 후보와 설명란 구조(도입부·타임스탬프 등)를 제시합니다.

## 3. ✨ Nano Banana Pro 프롬프트 (Nano Banana Pro Prompts)

썸네일용 영문 프롬프트 예시 한 덩어리.

## 4. 🕒 초기 24시간 성과 진단 (First 24h Diagnostics)

CTR·첫 30초 이탈 가설.

## 5. 🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)

약속 대비 전달 일치도 평가.

## 6. 🤖 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)

| 최적화 항목(Optimization Item) | 현재 상태 진단(Current Status Assessment) | 구체적인 개선 방안(Specific Improvement Actions) |
| --- | --- | --- |
| 제목(Titles) | 보통 | 숫자·괄호 활용 CTR 실험 |
| 설명란(Descriptions) | 양호 | 타임스탬프 보강 |
| 태그(Tags) | 보통 | 관련 롱테일 추가 |
| 썸네일(Thumbnails) | 개선 필요 | 모바일 가독성 |

## 7. 📱 쇼츠 콘텐츠 전략 (Shorts Content Strategy)

쇼츠 아이디어 3개 — 각각 Initial Hook / Core Content / CTA / Thumbnail CTA Text를 포함합니다.

## 8. 🎬 영상 분석 — 마케터·PD 심층 인사이트 (Role-Based Video Analysis)

**마케터 (Marketer)**

- Lesson learned: **플랫폼별 톤** 차이를 반영한 재배포 문구

**영상 기획 및 PD (Producer / PD)**

- 레퍼런스 표:

| 채널명 | 공식·대표 URL(채널 또는 대표 영상) | 참고 포인트 | 팩트 체크(검증 상태·근거) |
| --- | --- | --- | --- |
| 레퍼런스 B | https://www.youtube.com/ | 오프닝 구조 | 부분 확인 — 검색 스니펫 |

## ✅ 우선 실행 액션 플랜 (7일)

### Day 1

- [ ] 제목 A/B 안 2개 작성
- [ ] 설명 첫 2줄 SEO 보강
- [ ] 쇼츠 훅 스크립트 초안
- [ ] 댓글 질문 1개 준비
`;
