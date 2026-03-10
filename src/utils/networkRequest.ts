export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function describeNetworkError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return 'timeout';
    }
    return error.message;
  }
  return String(error);
}
