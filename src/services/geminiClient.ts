import { GoogleGenAI } from "@google/genai";

export function isGeminiApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!isGeminiApiKeyConfigured()) {
    throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
  }
  return geminiClient;
}
