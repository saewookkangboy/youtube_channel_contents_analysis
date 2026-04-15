/**
 * 채널/영상 분석 리포트의 `##` 제목·완성도 검사 키 단일 출처.
 * 프롬프트 본문(geminiService)·완성도 검사(reportCompleteness)·로컬 형식 보강(agentOrchestrationRoles)이 같은 스펙을 쓰도록 유지한다.
 */

export interface ReportSectionSpec {
  /** `##` 한 줄(한국어 출력 시 권장 제목) */
  headingKoLine: string;
  /** `##` 한 줄(영어 출력 시 권장 제목) */
  headingEnLine: string;
  /** extractMarkdownHeadings 결과에 대한 부분 문자열 매칭용 키 */
  matchKeys: readonly string[];
}

/** 채널: 본문 0~15 + 마지막 액션 플랜 `##` (algorithmInsights JSON은 그 다음) */
export const CHANNEL_REPORT_SECTIONS: readonly ReportSectionSpec[] = [
  {
    headingKoLine: '## 0. 🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)',
    headingEnLine: '## 0. 🔍 Fact check & raw data',
    matchKeys: ['팩트 체크', 'fact check', 'raw data', 'fact check &'],
  },
  {
    headingKoLine: '## 1. 📊 채널 데이터 및 현황 분석 (Channel Data Analysis)',
    headingEnLine: '## 1. 📊 Channel data & status',
    matchKeys: ['채널 데이터', '현황 분석', 'channel data', 'channel analysis', 'data analysis'],
  },
  {
    headingKoLine: '## 2. 🚀 콘텐츠 성과 분석 (Content Performance Analysis)',
    headingEnLine: '## 2. 🚀 Content performance',
    matchKeys: ['콘텐츠 성과', 'content performance', 'performance analysis'],
  },
  {
    headingKoLine: '## 3. 💰 다각화된 수익화 전략 (Advanced Monetization Strategies)',
    headingEnLine: '## 3. 💰 Monetization strategy',
    matchKeys: ['수익화', 'monetization'],
  },
  {
    headingKoLine: '## 4. 📈 구독자 증가를 위한 전략 (Subscriber Growth Strategy)',
    headingEnLine: '## 4. 📈 Subscriber growth',
    matchKeys: ['구독자 증가', 'subscriber growth', 'subscriber'],
  },
  {
    headingKoLine: '## 5. 🕒 초기 24시간 성과 진단 (First 24h Diagnostics)',
    headingEnLine: '## 5. 🕒 First 24h performance',
    matchKeys: ['24시간', '초기 24', 'first 24', '24h', '24-hour'],
  },
  {
    headingKoLine: '## 6. 🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)',
    headingEnLine: '## 6. 🎯 Satisfaction diagnostic card',
    matchKeys: ['만족도', '진단 카드', 'satisfaction', 'diagnostic card'],
  },
  {
    headingKoLine: '## 7. 🤖 유튜브 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)',
    headingEnLine: '## 7. 🤖 Algorithm & SEO optimization',
    matchKeys: ['알고리즘', 'seo', 'algorithm'],
  },
  {
    headingKoLine: '## 8. ✍️ 영상 제목 효율성 및 개선 제안 (Video Title Effectiveness & Suggestions)',
    headingEnLine: '## 8. ✍️ Title effectiveness & suggestions',
    matchKeys: ['영상 제목 효율성', '제목 효율성', 'title effectiveness', 'video title'],
  },
  {
    headingKoLine: '## 9. 🤝 시청자 참여 및 커뮤니티 전략 (User Engagement Features)',
    headingEnLine: '## 9. 🤝 Engagement & community',
    matchKeys: ['시청자 참여', '커뮤니티', 'engagement', 'community'],
  },
  {
    headingKoLine: '## 10. ⏰ 최적의 업로드 시간 및 요일 제안 (Optimal Publishing Schedule)',
    headingEnLine: '## 10. ⏰ Upload schedule & timing',
    matchKeys: ['업로드 시간', '요일', 'upload schedule', 'publishing', 'optimal time'],
  },
  {
    headingKoLine: '## 11. 💡 신규 콘텐츠 시리즈 아이디어 (New Content Series Ideas)',
    headingEnLine: '## 11. 💡 New content series ideas',
    matchKeys: ['시리즈 아이디어', '콘텐츠 시리즈', 'series ideas', 'content series'],
  },
  {
    headingKoLine: '## 12. 🎥 영상 및 오디오 품질 개선 제안 (Video & Audio Quality Improvement)',
    headingEnLine: '## 12. 🎥 Video & audio quality',
    matchKeys: ['오디오 품질', '영상 및 오디오', 'audio quality', 'video quality'],
  },
  {
    headingKoLine: '## 13. 👀 타겟 시청자 교차 시청 채널 분석 (Audience Cross-Viewership Analysis)',
    headingEnLine: '## 13. 👀 Cross-viewership & audience overlap',
    matchKeys: ['교차 시청', '크로스', 'cross-viewership', 'cross viewership', 'audience overlap'],
  },
  {
    headingKoLine: '## 14. 📱 유튜브 쇼츠(Shorts) 연계 및 활용 전략 (Shorts Strategy)',
    headingEnLine: '## 14. 📱 YouTube Shorts',
    matchKeys: ['쇼츠', 'shorts'],
  },
  {
    headingKoLine: '## 15. 📣 채널 분석 — 마케터·PD 심층 인사이트 (Role-Based Channel Analysis)',
    headingEnLine: '## 15. 📣 Role-based channel analysis (Marketer & PD)',
    matchKeys: ['마케터·pd', '역할별', 'role-based channel', 'producer / pd', 'marketer'],
  },
  {
    headingKoLine: '## ✅ 우선 실행 액션 플랜 (7일)',
    headingEnLine: '## ✅ Priority 7-day action plan',
    matchKeys: ['우선 실행', '액션 플랜', '7일차', '7일', 'action plan', '7-day', '7 day'],
  },
] as const;

/** 영상: 본문 0~8 + 액션 플랜 */
export const VIDEO_REPORT_SECTIONS: readonly ReportSectionSpec[] = [
  {
    headingKoLine: '## 0. 🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)',
    headingEnLine: '## 0. 🔍 Fact check & raw data',
    matchKeys: ['팩트 체크', 'fact check', 'raw data', 'fact check &'],
  },
  {
    headingKoLine: '## 1. 📊 영상 상세 분석 (Detailed Video Analysis)',
    headingEnLine: '## 1. 📊 Detailed video analysis',
    matchKeys: ['영상 상세', 'detailed video', 'video analysis'],
  },
  {
    headingKoLine: '## 2. 📝 제목 및 설명란 추천 (Title & Description Recommendations)',
    headingEnLine: '## 2. 📝 Title & description',
    matchKeys: ['제목 및 설명란', 'title & description', 'title and description'],
  },
  {
    headingKoLine: '## 3. ✨ Nano Banana Pro 프롬프트 (Nano Banana Pro Prompts)',
    headingEnLine: '## 3. ✨ Nano Banana Pro prompts',
    matchKeys: ['nano banana', 'banana pro'],
  },
  {
    headingKoLine: '## 4. 🕒 초기 24시간 성과 진단 (First 24h Diagnostics)',
    headingEnLine: '## 4. 🕒 First 24h performance',
    matchKeys: ['24시간', '초기 24', 'first 24', '24h'],
  },
  {
    headingKoLine: '## 5. 🎯 만족도 중심 진단 카드 (Satisfaction Fit Card)',
    headingEnLine: '## 5. 🎯 Satisfaction diagnostic card',
    matchKeys: ['만족도', '진단 카드', 'satisfaction', 'diagnostic card'],
  },
  {
    headingKoLine: '## 6. 🤖 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)',
    headingEnLine: '## 6. 🤖 Algorithm & SEO optimization',
    matchKeys: ['알고리즘', 'seo', 'algorithm'],
  },
  {
    headingKoLine: '## 7. 📱 쇼츠 콘텐츠 전략 (Shorts Content Strategy)',
    headingEnLine: '## 7. 📱 Shorts content strategy',
    matchKeys: ['쇼츠', 'shorts'],
  },
  {
    headingKoLine: '## 8. 🎬 영상 분석 — 마케터·PD 심층 인사이트 (Role-Based Video Analysis)',
    headingEnLine: '## 8. 🎬 Role-based video analysis (Marketer & PD)',
    matchKeys: ['마케터·pd', '역할별', 'role-based video', 'lesson learned', '레퍼런스'],
  },
  {
    headingKoLine: '## ✅ 우선 실행 액션 플랜 (7일)',
    headingEnLine: '## ✅ Priority 7-day action plan',
    matchKeys: ['우선 실행', '액션 플랜', '7일차', '7일', 'action plan', '7-day', '7 day'],
  },
] as const;

export function reportSectionsForKind(kind: 'channel' | 'video'): readonly ReportSectionSpec[] {
  return kind === 'channel' ? CHANNEL_REPORT_SECTIONS : VIDEO_REPORT_SECTIONS;
}
