import { GoogleGenAI } from "@google/genai";
import { YouTubeChannelData, YouTubeVideoData } from "./youtubeApiService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AlgorithmInsight {
  label: string;
  status: 'green' | 'yellow' | 'red';
}

export interface AnalysisResult {
  text: string;
  sources: { title?: string; uri: string }[];
  algorithmInsights?: AlgorithmInsight[];
}

export async function analyzeYouTubeVideo(videoUrl: string, rawData?: YouTubeVideoData | null): Promise<AnalysisResult> {
  const model = "gemini-3.1-pro-preview"; // Using pro for better creative prompt generation
  
  let rawDataPrompt = "";
  if (rawData) {
    rawDataPrompt = `
    [SYSTEM: 100% ACCURATE REAL-TIME YOUTUBE API DATA]
    - 영상 제목: ${rawData.title}
    - 채널명: ${rawData.channelTitle}
    - 업로드일: ${rawData.publishedAt}
    - 조회수: ${rawData.views}
    - 좋아요 수: ${rawData.likes}
    - 댓글 수: ${rawData.comments}
    - 태그: ${rawData.tags.join(', ')}
    - 설명란: ${rawData.description.substring(0, 500)}...
    
    위 데이터는 YouTube API에서 방금 가져온 100% 정확한 실시간 팩트 데이터입니다.
    분석 시 이 수치들을 절대적으로 신뢰하고, 이 수치를 바탕으로 "0. 🔍 팩트 체크 및 로우 데이터" 섹션을 가장 먼저 작성하세요.
    `;
  }

  const prompt = `
    당신은 세계 최고의 유튜브 콘텐츠 전략가이자 AI 프롬프트 엔지니어입니다.
    다음 유튜브 영상 URL을 분석하고, 크리에이터가 즉시 활용할 수 있는 상세한 전략 리포트를 작성해 주세요.
    
    URL: ${videoUrl}
    ${rawDataPrompt}

    Please provide a comprehensive report in Korean (한국어) with the following sections, using relevant emojis for each heading:

    0. **🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)**:
       - 할루시네이션(거짓 정보) 방지를 위해, 제공된 [SYSTEM: 100% ACCURATE REAL-TIME YOUTUBE API DATA] (또는 검색된 데이터)를 기반으로 실제 데이터(영상 제목, 채널명, 조회수, 좋아요 수, 댓글 수 등)를 가감 없이 있는 그대로 먼저 나열.
       - 이후 모든 분석은 반드시 이 데이터에 기반하여 작성할 것.

    1. **📊 영상 상세 분석 (Detailed Video Analysis)**:
       - 영상의 전반적인 성과, 시청자 반응, 핵심 강점 및 약점 분석.
       - 시청자가 이 영상에 반응한 주요 요인(Hook, 편집, 스토리텔링 등).

    2. **📝 제목 및 설명란 추천 (Title & Description Recommendations)**:
       - **제목 추천 (Title Recommendations)**: 클릭률(CTR)과 검색 최적화(SEO)를 모두 잡을 수 있는 매력적인 영상 제목 후보 3~5가지를 제안해 주세요.
       - **설명란 추천 (Description Recommendations)**: 유튜브 SEO에 최적화된 구조적인 설명란(Description) 초안을 작성해 주세요. 다음 요소를 반드시 포함해야 합니다:
         - **도입부 (Hook)**: 시청자의 이목을 끄는 1~2줄의 요약.
         - **상세 설명 (Detailed Summary)**: 영상의 핵심 내용과 타겟 키워드가 자연스럽게 녹아든 상세한 설명.
         - **타임스탬프 (Timestamps)**: 주요 내용별 타임라인 (예시 형태).
         - **채널 정보 및 CTA (Channel Info & CTA)**: 구독 유도 및 관련 링크 안내.
         - **해시태그 (Hashtags)**: 검색 노출을 극대화할 수 있는 핵심 해시태그 3~5개.

    3. **✨ Nano Banana Pro 프롬프트 (Nano Banana Pro Prompts)**:
       - 이 영상의 매력도를 극대화할 수 있는 새로운 **썸네일(Thumbnail)** 제작을 위한 'Nano Banana Pro(최고 성능의 이미지/텍스트 생성 AI 모델)'용 프롬프트를 상세히 작성.
       - 썸네일 프롬프트는 영문으로 작성하여 이미지 생성에 바로 쓸 수 있게 하고, 구체적인 구도, 조명, 피사체, 분위기를 묘사할 것.

    4. **🤖 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)**:
       - **[필수] 알고리즘 & SEO 개선 체크리스트 (Markdown 표 형식)**:
         - 반드시 다음의 열(Column)을 포함하는 상세한 **Markdown 표(Table)**를 작성하세요: '최적화 항목(Optimization Item)', '현재 상태 진단(Current Status Assessment)', '구체적인 개선 방안(Specific Improvement Actions)'.
         - 표에 포함될 필수 최적화 항목: **제목(Titles), 설명란(Descriptions), 태그(Tags), 썸네일(Thumbnails)**.
       - **추천 비디오 태그 (Recommended Video Tags)**:
         - SEO 최적화 및 알고리즘 노출을 극대화하기 위한 핵심 키워드 및 태그 목록 제안.

    5. **📱 쇼츠 콘텐츠 전략 (Shorts Content Strategy)**:
       - 이 롱폼 영상에서 파생될 수 있는 **3개의 구체적인 쇼츠(Shorts) 콘텐츠 아이디어**.
       - 각 쇼츠 아이디어별로 다음을 반드시 포함:
         - **Initial Hook (초반 3초 훅)**: 시청자의 이목을 단숨에 끄는 도입부
         - **Core Content (핵심 전개 내용)**: 60초 이내로 압축된 핵심 하이라이트
         - **Call-to-Action (CTA)**: 롱폼 본편 시청이나 구독을 유도하는 명확한 액션 플랜
         - **썸네일 내 CTA 문구 추천 (Thumbnail CTA Text)**: 각 쇼츠 컨셉의 썸네일(또는 영상 내 텍스트 오버레이)에 포함할 구체적이고 강력한 Call-to-Action 텍스트 추천.

    [중요: 알고리즘 인사이트 JSON 데이터]
    리포트 내용 어딘가에 반드시 아래 형식의 JSON 코드 블록을 포함해 주세요. 이 데이터는 UI의 신호등 상태를 표시하는 데 사용됩니다. 분석 결과에 따라 각 항목의 상태를 'green'(우수), 'yellow'(보통/개선필요), 'red'(위험/부족) 중 하나로 평가해 주세요.
    \`\`\`json
    {
      "algorithmInsights": [
        { "label": "제목 최적화 (Title SEO)", "status": "green" },
        { "label": "썸네일 매력도 (Thumbnail CTR)", "status": "yellow" },
        { "label": "시청 지속 시간 (Retention)", "status": "red" },
        { "label": "시청자 참여 (Engagement)", "status": "green" },
        { "label": "태그 및 메타데이터 (Tags/Meta)", "status": "yellow" }
      ]
    }
    \`\`\`

    Use Google Search to get the most up-to-date information about the video's context and trends.
    Return the analysis in a structured, professional Markdown format.
    
    **중요**: 가독성을 위해 각 문단 사이에는 반드시 두 번의 줄바꿈(Double Line Break)을 사용하여 여백을 충분히 확보해 주세요. 소제목과 본문 사이에도 적절한 간격을 두어 시각적으로 편안하게 읽힐 수 있도록 구성해 주세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      }
    });

    let text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web?.uri)
      .map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri as string
      }));

    let algorithmInsights: AlgorithmInsight[] | undefined = undefined;
    const jsonRegex = /```json\s*(\{[\s\S]*?"algorithmInsights"[\s\S]*?\})\s*```/;
    const match = text.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.algorithmInsights) {
          algorithmInsights = parsed.algorithmInsights;
        }
        // Remove the JSON block from the markdown output
        text = text.replace(jsonRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse algorithm insights JSON", e);
      }
    }

    return { text, sources, algorithmInsights };
  } catch (error) {
    console.error("Gemini API Error (Video Analysis):", error);
    throw error;
  }
}

export async function analyzeYouTubeChannel(channelUrl: string, rawData?: YouTubeChannelData | null): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  let rawDataPrompt = "";
  if (rawData) {
    rawDataPrompt = `
    [SYSTEM: 100% ACCURATE REAL-TIME YOUTUBE API DATA]
    - 채널명: ${rawData.channelName}
    - 구독자 수: ${rawData.subscriberCount}명
    - 총 조회수: ${rawData.totalViews}회
    - 총 영상 수: ${rawData.videoCount}개
    - 최근 업로드 영상 5개 데이터:
${rawData.recentVideos.map((v, i) => `      ${i+1}. "${v.title}" (조회수: ${v.views}, 좋아요: ${v.likes}, 댓글: ${v.comments}, 업로드일: ${v.publishedAt})`).join('\n')}
    
    위 데이터는 YouTube API에서 방금 가져온 100% 정확한 실시간 팩트 데이터입니다.
    분석 시 이 수치들을 절대적으로 신뢰하고, 이 수치를 바탕으로 "0. 🔍 팩트 체크 및 로우 데이터" 섹션을 가장 먼저 작성하세요.
    `;
  }

  const prompt = `
    Analyze the following YouTube channel in depth: ${channelUrl}
    ${rawDataPrompt}
    
    Please provide a comprehensive report in Korean (한국어) with the following sections, using relevant emojis for each heading:
    
    0. **🔍 팩트 체크 및 로우 데이터 (Fact Check & Raw Data)**:
       - 할루시네이션(거짓 정보) 방지를 위해, 제공된 [SYSTEM: 100% ACCURATE REAL-TIME YOUTUBE API DATA] (또는 검색된 데이터)를 기반으로 실제 데이터(구독자 수, 총 조회수, 최근 업로드된 영상 3~5개의 정확한 제목과 조회수 등)를 가감 없이 있는 그대로 먼저 나열.
       - 이후 모든 분석은 반드시 이 데이터에 기반하여 작성할 것.
       
    1. **📊 채널 데이터 및 현황 분석 (Channel Data Analysis)**:
       - 채널의 현재 규모, 주요 지표, 최근 성장세 분석.
       
    2. **🚀 콘텐츠 성과 분석 (Content Performance Analysis)**:
       - 가장 성과가 좋은 콘텐츠 유형 및 개별 영상 분석.
       - 평균 시청 지속 시간(AVD), 시청자 유지율(Retention), 시청자 인구통계(성별, 연령대 등) 등 핵심 지표 분석.
       - 시청 지속 시간(Retention)을 극대화하기 위한 최신 편집 트렌드 적용 방안 (예: 패턴 인터럽트(Pattern Interrupts), 시각적 훅(Visual Hooks), 스토리텔링 아크 개선).
       - 조회수, 댓글, 좋아요 등 참여도가 높은 영상들의 데이터 기반 공통점 파악.
       
    3. **💰 다각화된 수익화 전략 (Advanced Monetization Strategies)**:
       - 단순 광고 수익을 넘어선 니치(Niche) 맞춤형 수익화 모델 제안 (예: 고단가 제휴 마케팅(Affiliate), 자체 디지털 상품/강의, 멤버십 전용 혜택 기획).
       - 이 채널이 브랜드 스폰서십을 유치하기 위해 어필할 수 있는 '핵심 셀링 포인트(USP)'와 구체적인 타겟 브랜드 카테고리 3가지 제안.
       - 커뮤니티 기반 수익 창출(Patreon, Discord 등)을 위한 구체적인 3단계 실행 계획 제시.
       
    4. **📈 구독자 증가를 위한 전략 (Subscriber Growth Strategy)**:
       - 신규 시청자를 구독자로 전환시키기 위한 구체적인 액션 플랜.
       
    5. **🤖 유튜브 알고리즘 및 SEO 최적화 가이드 (Algorithm & SEO Optimization)**:
       - **[필수] 알고리즘 & SEO 개선 체크리스트 (Markdown 표 형식)**:
         - 반드시 다음의 열(Column)을 포함하는 상세한 **Markdown 표(Table)**를 작성하세요: '최적화 항목(Optimization Item)', '현재 상태 진단(Current Status Assessment)', '구체적인 개선 방안(Specific Improvement Actions)'.
         - 표에 포함될 필수 최적화 항목: **제목(Titles), 설명란(Descriptions), 태그(Tags), 썸네일(Thumbnails)**.
       - **검색 의도(Search Intent) 및 에버그린(Evergreen) 키워드**: 일회성 트래픽이 아닌 지속적인 검색 유입을 만드는 롱테일 키워드 전략 및 추천 태그.
       - **정주행 유도(Binge-watching Loop)**: 최종 화면(End Screen), 카드, 재생목록을 전략적으로 배치하여 세션 시간(Session Time)을 늘리는 구체적 방법.
       - **썸네일 효율성 분석 및 개선 제안 (Thumbnail Effectiveness)**: 채널의 최근 썸네일 이미지들을 분석하여 시각적 매력도(Visual Appeal), 텍스트 가독성(Text Readability), 감정적 소구력(Emotional Impact)을 높여 클릭률(CTR)을 증가시킬 수 있는 구체적이고 실행 가능한 개선 방안 제시.
       - **최근 인기 영상 기반 썸네일 추천 (Thumbnail Recommendations based on Top Recent Videos)**: 제공된 '최근 업로드 영상 데이터' 중 **좋아요 수와 조회수가 가장 높은 최신 콘텐츠**를 집중 분석하여, 해당 영상의 성공 요인을 극대화할 수 있는 **적절한 썸네일 이미지 추천 디자인**을 구체적인 '제안 사항'으로 정리하여 제시.
       - **인물 및 이미지 활용 (Faces & Striking Imagery)**: 영상의 핵심 주제와 완벽하게 일치하면서도 시청자의 감정을 극대화할 수 있는 인물의 표정(Faces)이나 강렬한 시각적 이미지(Striking Imagery)를 썸네일에 효과적으로 배치하는 구체적인 방법 제안.
       - 색상 대비(Color Contrast), 폰트 선택(Font Choices), 다양한 화면 크기(모바일 등)에서도 가독성이 뛰어난 텍스트 크기 및 배치(Placement)에 대한 구체적인 가이드라인 제공.
       - 썸네일 클릭률을 높이기 위한 **2~3가지의 명확하고 구별되는 디자인 개선안(Distinct Design Recommendations)**을 구체적으로 제안.

    6. **✍️ 영상 제목 효율성 및 개선 제안 (Video Title Effectiveness & Suggestions)**:
       - 현재 사용 중인 제목의 클릭 유도 효율성 분석.
       - 검색 최적화(SEO)를 위한 키워드 배치 및 클릭률(CTR)을 높이기 위한 매력적인 제목 스타일 제안.
       - 시청자의 호기심을 자극하는 '클릭 트리거(Click Triggers)'를 활용한 구체적인 제목 수정 예시 3가지 제공.

    7. **🤝 시청자 참여 및 커뮤니티 전략 (User Engagement Features)**:
       - 구독자와의 상호작용을 높이기 위한 인터랙티브 요소 제안 (설문조사, Q&A 세션 등).
       - 커뮤니티 탭 활용 전략 및 시청자 충성도 강화를 위한 구체적인 방법.

    8. **⏰ 최적의 업로드 시간 및 요일 제안 (Optimal Publishing Schedule)**:
       - 시청자 인구통계 및 활동 패턴을 기반으로 조회수와 참여도를 극대화할 수 있는 최적의 업로드 시간대와 요일 분석.
       - 타겟 시청층의 라이프스타일을 고려한 맞춤형 스케줄 제안.

    9. **💡 신규 콘텐츠 시리즈 아이디어 (New Content Series Ideas)**:
       - 채널의 니치(Niche), 시청자 성향(Audience), 기존 성공 사례(Successful Content Types)를 바탕으로 2~3개의 독창적인 신규 콘텐츠 시리즈(Original Content Series) 제안.
       - 썸네일과 제목을 먼저 기획하는 'Thumbnail-First' 접근법에 기반한 신규 콘텐츠 포맷 기획안 포함.
       - 각 시리즈별로 기획 의도 및 콘셉트(Concept), 타겟 시청자 어필 포인트(Target Audience Appeal), 예상 참여도 및 기대 효과(Expected Engagement Impact)를 구체적으로 포함.

    10. **🎥 영상 및 오디오 품질 개선 제안 (Video & Audio Quality Improvement)**:
        - 현재 영상의 시각적/청각적 품질을 분석하고 개선하기 위한 구체적이고 즉시 실행 가능한(Actionable) 방법 제안.
        - **장비 추천(Equipment Recommendations)**: 채널 규모와 예산, 촬영 환경에 맞는 구체적인 장비 모델(예: 특정 카메라 바디/렌즈, 샷건/다이나믹 마이크, 조명 세팅 등)을 명시하여 추천.
        - **편집 기술(Editing Techniques)**: 영상의 완성도를 높일 수 있는 구체적인 편집 팁(예: LUT를 활용한 색보정(Color Grading), 컴프레서/EQ를 활용한 오디오 믹싱, 시청 유지율을 높이는 컷편집 리듬 등) 가이드.

    11. **👀 타겟 시청자 교차 시청 채널 분석 (Audience Cross-Viewership Analysis)**:
        - '내 시청자가 시청하는 다른 채널(유사 채널 및 경쟁 채널)'의 트렌드와 인기 요인을 분석.
        - 해당 채널들의 성공적인 콘텐츠 포맷, 주제, 업로드 주기 등을 파악하여 실제 채널 운영에 적용할 수 있는 벤치마킹 포인트 도출.
        - 이를 바탕으로 현재 채널에 즉시 도입해 볼 수 있는 **구체적인 콘텐츠 제작 아이디어 및 채널 운영 전략**을 제안.

    12. **📱 유튜브 쇼츠(Shorts) 연계 및 활용 전략 (Shorts Strategy)**:
        - 현재 채널의 **가장 인기 있는 롱폼 콘텐츠(Top Performing Content)**를 기반으로 한 쇼츠(Shorts) 콘텐츠 구성 아이디어 제안.
        - 기존 롱폼 영상의 핵심 하이라이트를 60초 이내로 재가공(Repurposing)하거나 쇼츠 전용으로 기획할 수 있는 구체적인 아이디어를 **상세한 Bullet Point(글머리 기호)** 형태로 3~4가지(3-4 distinct Shorts concepts) 제시.
        - 각 쇼츠 아이디어별로 다음 4가지 요소를 반드시 포함하여 구체적으로 명시: 
          1) **Initial Hook (초반 3초 훅)**: 시청자의 이목을 단숨에 끄는 도입부
          2) **Core Content (핵심 전개 내용)**: 60초 이내로 압축된 핵심 하이라이트
          3) **Call-to-Action (CTA)**: 롱폼 본편 시청이나 구독을 유도하는 명확한 액션 플랜
          4) **썸네일 내 CTA 문구 추천 (Thumbnail CTA Text)**: 각 쇼츠 컨셉의 썸네일에 포함할 구체적이고 강력한 Call-to-Action 텍스트 추천.
    
    [중요: 알고리즘 인사이트 JSON 데이터]
    리포트 내용 어딘가에 반드시 아래 형식의 JSON 코드 블록을 포함해 주세요. 이 데이터는 UI의 신호등 상태를 표시하는 데 사용됩니다. 분석 결과에 따라 각 항목의 상태를 'green'(우수), 'yellow'(보통/개선필요), 'red'(위험/부족) 중 하나로 평가해 주세요.
    \`\`\`json
    {
      "algorithmInsights": [
        { "label": "콘텐츠 성과 (Content Performance)", "status": "green" },
        { "label": "수익화 전략 (Monetization)", "status": "yellow" },
        { "label": "구독자 증가 (Subscriber Growth)", "status": "red" },
        { "label": "SEO 및 알고리즘 (SEO/Algorithm)", "status": "green" },
        { "label": "시청자 참여 (Audience Engagement)", "status": "yellow" }
      ]
    }
    \`\`\`

    Use Google Search to get the most up-to-date information about the channel's recent performance and trends.
    Return the analysis in a structured, professional Markdown format.
    
    **중요**: 가독성을 위해 각 문단 사이에는 반드시 두 번의 줄바꿈(Double Line Break)을 사용하여 여백을 충분히 확보해 주세요. 소제목과 본문 사이에도 적절한 간격을 두어 시각적으로 편안하게 읽힐 수 있도록 구성해 주세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }, { urlContext: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      },
    });

    let text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web?.uri);
    
    // Deduplicate by URI
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    let algorithmInsights: AlgorithmInsight[] | undefined = undefined;
    const jsonRegex = /```json\s*(\{[\s\S]*?"algorithmInsights"[\s\S]*?\})\s*```/;
    const match = text.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.algorithmInsights) {
          algorithmInsights = parsed.algorithmInsights;
        }
        // Remove the JSON block from the markdown output
        text = text.replace(jsonRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse algorithm insights JSON", e);
      }
    }

    return { text, sources: uniqueSources, algorithmInsights };
  } catch (error) {
    console.error("Error analyzing channel:", error);
    throw error;
  }
}
