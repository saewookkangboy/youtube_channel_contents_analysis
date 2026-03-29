import type { TranslationKey } from "../i18n/translations";
import { isUserAbortError, ResilientHttpError } from "./resilience";

export type AnalysisErrorKind =
  | "aborted"
  | "rate_limited"
  | "auth"
  | "forbidden"
  | "bad_request"
  | "not_found"
  | "server"
  | "network"
  | "unknown";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function classifyAnalysisError(error: unknown): AnalysisErrorKind {
  if (isUserAbortError(error)) return "aborted";
  if (error instanceof ResilientHttpError) {
    const st = error.status;
    if (st === 429) return "rate_limited";
    if (st === 401) return "auth";
    if (st === 403) return "forbidden";
    if (st === 404) return "not_found";
    if (st >= 500 && st <= 599) return "server";
    if (st >= 400 && st <= 499) return "bad_request";
  }
  const rec = error as { name?: string; status?: number };
  if (rec.name === "ApiError" && typeof rec.status === "number") {
    const st = rec.status;
    if (st === 429) return "rate_limited";
    if (st === 401) return "auth";
    if (st === 403) return "forbidden";
    if (st === 404) return "not_found";
    if (st >= 500 && st <= 599) return "server";
    if (st >= 400 && st <= 499) return "bad_request";
  }
  const msg = messageOf(error);
  if (/Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT|load failed|network/i.test(msg)) {
    return "network";
  }
  return "unknown";
}

export function analysisErrorTranslationKey(kind: AnalysisErrorKind): TranslationKey {
  switch (kind) {
    case "aborted":
      return "errAborted";
    case "rate_limited":
      return "errRateLimited";
    case "auth":
      return "errAuth";
    case "forbidden":
      return "errForbidden";
    case "bad_request":
      return "errBadRequest";
    case "not_found":
      return "errNotFound";
    case "server":
      return "errServer";
    case "network":
      return "errNetwork";
    default:
      return "errUnknown";
  }
}

export function analysisErrorTranslationKeyForChannel(kind: AnalysisErrorKind): TranslationKey {
  if (kind === "unknown") return "errChannelFailed";
  return analysisErrorTranslationKey(kind);
}

export function analysisErrorTranslationKeyForVideo(kind: AnalysisErrorKind): TranslationKey {
  if (kind === "unknown") return "errVideoFailed";
  return analysisErrorTranslationKey(kind);
}
