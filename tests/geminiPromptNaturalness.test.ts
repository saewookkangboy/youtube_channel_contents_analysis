import { describe, expect, it } from "vitest";
import {
  buildChannelAnalysisPrompt,
  buildVideoAnalysisPrompt,
} from "../src/services/geminiService";

describe("korean naturalness prompt contract", () => {
  it("includes korean naturalness contract in video prompt", () => {
    const prompt = buildVideoAnalysisPrompt({
      videoUrl: "https://www.youtube.com/watch?v=abc123",
      factBlock: "",
      analyticsBlock: "",
      semanticGroundingBlock: "",
      useWebTools: true,
      locale: "ko",
      provider: "gemini",
    });

    expect(prompt).toContain("[한국어 자연화 스타일 계약 — 최종 출력물 품질]");
    expect(prompt).toContain("번역투 축소");
    expect(prompt).toContain("의미 불변");
  });

  it("does not include korean naturalness contract in english prompt", () => {
    const prompt = buildChannelAnalysisPrompt({
      channelUrl: "https://www.youtube.com/@sample",
      factBlock: "",
      analyticsBlock: "",
      semanticGroundingBlock: "",
      useWebTools: true,
      locale: "en",
      provider: "openai",
    });

    expect(prompt).not.toContain("[한국어 자연화 스타일 계약 — 최종 출력물 품질]");
  });
});
