/**
 * 개발 환경 전용: 분석 실행 결과를 에피소드처럼 누적해 보상 지표를 세션에 저장.
 * [dev-agent-kit](https://github.com/saewookkangboy/dev-agent-kit) Lightning 모듈의
 * 브라우저·비파괴적 대안(실제 RL 루프는 아님).
 */

const STORAGE_KEY = "ytca-dev-analysis-episodes";
const MAX_EPISODES = 40;

export interface AnalysisEpisode {
  at: string;
  kind: "channel" | "video";
  ok: boolean;
  durationMs: number;
  promptTokens: number;
  outputTokens: number;
  completenessOk: boolean;
}

function readEpisodes(): AnalysisEpisode[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is AnalysisEpisode =>
        e &&
        typeof e === "object" &&
        typeof (e as AnalysisEpisode).at === "string" &&
        ((e as AnalysisEpisode).kind === "channel" || (e as AnalysisEpisode).kind === "video"),
    );
  } catch {
    return [];
  }
}

function writeEpisodes(episodes: AnalysisEpisode[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(episodes.slice(-MAX_EPISODES)));
  } catch {
    /* quota / private mode */
  }
}

/** 성공 시 completeness·토큰·지연을 반영한 단순 보상(0~1 스케일 근사) */
export function episodeReward(e: AnalysisEpisode): number {
  if (!e.ok) return 0;
  let r = e.completenessOk ? 0.55 : 0.25;
  const totalTok = e.promptTokens + e.outputTokens;
  if (totalTok > 0 && totalTok < 12000) r += 0.2;
  else if (totalTok >= 12000) r += 0.08;
  if (e.durationMs > 0 && e.durationMs < 45000) r += 0.15;
  else if (e.durationMs >= 45000) r += 0.05;
  return Math.min(1, r);
}

export function recordAnalysisEpisode(episode: AnalysisEpisode): void {
  const next = [...readEpisodes(), episode];
  writeEpisodes(next);
}

export function getAnalysisReinforcementStats(): {
  episodes: AnalysisEpisode[];
  count: number;
  avgReward: number;
  successRate: number;
} {
  const episodes = readEpisodes();
  if (episodes.length === 0) {
    return { episodes: [], count: 0, avgReward: 0, successRate: 0 };
  }
  const rewards = episodes.map(episodeReward);
  const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
  const oks = episodes.filter((e) => e.ok).length;
  return {
    episodes,
    count: episodes.length,
    avgReward: Math.round(avgReward * 1000) / 1000,
    successRate: Math.round((oks / episodes.length) * 1000) / 1000,
  };
}

export function clearAnalysisEpisodes(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
