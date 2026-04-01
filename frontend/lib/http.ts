export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorText: string;
}

function parseJson<T>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    const data = parseJson<T>(text);
    return {
      ok: response.ok,
      status: response.status,
      data,
      errorText: data === null ? text : '',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorText: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export function getErrorMessage(result: SafeFetchResult<unknown>, fallback: string): string {
  if (result.data && typeof result.data === 'object') {
    const payload = result.data as Record<string, unknown>;
    const detail = typeof payload.detail === 'string' ? payload.detail : '';
    const message = typeof payload.message === 'string' ? payload.message : '';
    if (detail) return detail;
    if (message) return message;
  }
  if (result.errorText) return result.errorText;
  if (result.status > 0) return `HTTP ${result.status}`;
  return fallback;
}
