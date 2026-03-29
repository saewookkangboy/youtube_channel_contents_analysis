/**
 * 외부 API·네트워크 호출용 회복력 유틸 (지수 백오프 + 지터).
 * Harness 등 SRE/배달 플랫폼에서 권장하는 일시적 장애 대응 패턴을 브라우저 환경에 맞게 단순화해 둔다.
 */

export function isUserAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error && typeof error === "object" && (error as Error).name === "AbortError") return true;
  return false;
}

/** `signal`이 있으면 abort 시 대기가 즉시 끊긴다. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"),
    );
  }
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
      reject(signal!.reason instanceof Error ? signal!.reason : new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** attempt는 0부터. 상한 cap으로 최대 대기를 제한한다. */
export function jitteredBackoffMs(attempt: number, baseMs: number, capMs: number): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * exp * 0.25;
  return Math.floor(exp * 0.75 + jitter);
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Gemini `@google/genai` ApiError(HTTP status) 및 일반 네트워크 실패를 일시적 오류로 본다.
 * 4xx 중 인증·권한·잘못된 요청은 재시도하지 않는다.
 */
export function isTransientGeminiError(error: unknown): boolean {
  if (isUserAbortError(error)) return false;
  if (!error || typeof error !== "object") {
    const msg = errorMessage(error);
    return /network|fetch|Failed to fetch|timeout/i.test(msg);
  }
  const rec = error as { name?: string; status?: number; message?: string };
  if (rec.name === "ApiError" && typeof rec.status === "number") {
    return isRetryableHttpStatus(rec.status);
  }
  const msg = errorMessage(error);
  if (/timeout|Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT/i.test(msg)) {
    return true;
  }
  return /429|503|504|502|RESOURCE_EXHAUSTED|UNAVAILABLE|quota|rate limit/i.test(msg);
}

/** OpenAI Node SDK `APIError` 및 네트워크 실패 */
export function isTransientOpenAIError(error: unknown): boolean {
  if (isUserAbortError(error)) return false;
  if (!error || typeof error !== "object") {
    const msg = errorMessage(error);
    return /network|fetch|Failed to fetch|timeout/i.test(msg);
  }
  const rec = error as { name?: string; status?: number; message?: string };
  if ((rec.name === "APIError" || rec.name === "ApiError") && typeof rec.status === "number") {
    return isRetryableHttpStatus(rec.status);
  }
  const msg = errorMessage(error);
  if (/timeout|Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT/i.test(msg)) {
    return true;
  }
  return /429|503|504|502|rate limit|overloaded/i.test(msg);
}

export type WithRetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attemptIndex: number) => boolean;
  onRetry?: (error: unknown, nextAttempt: number, delayMs: number) => void;
};

export async function withRetry<T>(operation: () => Promise<T>, options: WithRetryOptions): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    signal,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError");
    }
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const noMore = attempt >= maxAttempts - 1;
      if (noMore || !shouldRetry(err, attempt)) {
        throw err;
      }
      const delayMs = jitteredBackoffMs(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(err, attempt + 1, delayMs);
      await sleep(delayMs, signal);
    }
  }
  throw lastError;
}

export type ResilientFetchOptions = Partial<
  Pick<WithRetryOptions, "maxAttempts" | "baseDelayMs" | "maxDelayMs" | "signal" | "onRetry">
> & {
  /** 기본: 재시도 가능한 HTTP 상태 또는 fetch 네트워크 실패 */
  shouldRetry?: WithRetryOptions["shouldRetry"];
};

/**
 * `fetch` 래퍼: 5xx·429·408 및 네트워크 실패 시에만 재시도. 비정상 응답도 그대로 반환(호출부가 json·ok 처리).
 */
export async function resilientFetch(input: string | URL, init?: RequestInit, options?: ResilientFetchOptions): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const maxDelayMs = options?.maxDelayMs ?? 12_000;
  const signal = options?.signal;
  const onRetry = options?.onRetry;
  const shouldRetry = options?.shouldRetry ?? ((err: unknown) => isTransientFetchFailure(err));

  return withRetry(
    async () => {
      const res = await fetch(input, init);
      if (!res.ok && isRetryableHttpStatus(res.status)) {
        throw new ResilientHttpError(res.status, res.statusText, input.toString());
      }
      return res;
    },
    { maxAttempts, baseDelayMs, maxDelayMs, signal, shouldRetry, onRetry },
  );
}

export class ResilientHttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, statusText: string, url: string) {
    super(`HTTP ${status} ${statusText}`.trim());
    this.name = "ResilientHttpError";
    this.status = status;
    this.url = url;
  }
}

function isTransientFetchFailure(error: unknown): boolean {
  if (isUserAbortError(error)) return false;
  if (error instanceof ResilientHttpError) {
    return isRetryableHttpStatus(error.status);
  }
  if (error instanceof TypeError) {
    return true;
  }
  return isTransientGeminiError(error);
}
