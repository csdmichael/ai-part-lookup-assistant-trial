import type { FieldError, PartDetail, PartUpdate, SearchResponse } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  error?: { message?: string; details?: FieldError[] };
}

/** Normalises any HeadersInit shape while keeping the JSON default unless the caller overrides it. */
function mergeHeaders(init?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (!init) {
    return headers;
  }

  const entries: Array<[string, string]> = Array.isArray(init)
    ? init.map(([key, value]) => [key, value])
    : typeof Headers !== 'undefined' && init instanceof Headers
      ? Array.from(init.entries())
      : Object.entries(init as Record<string, string>);

  entries.forEach(([key, value]) => {
    headers[key.toLowerCase()] = value;
  });

  return headers;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: mergeHeaders(init?.headers)
    });
  } catch {
    throw new ApiError('We could not reach the part service. Check your connection and try again.', 0);
  }

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const body = payload as ApiErrorBody;
    throw new ApiError(
      body.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      body.error?.details ?? []
    );
  }

  return payload as T;
}

export function searchParts(query: string): Promise<SearchResponse> {
  return requestJson<SearchResponse>(`/parts?query=${encodeURIComponent(query)}`);
}

export function fetchPart(partNumber: string): Promise<PartDetail> {
  return requestJson<PartDetail>(`/parts/${encodeURIComponent(partNumber)}`);
}

export function updatePart(
  partNumber: string,
  changes: Partial<PartUpdate>
): Promise<{ success: boolean; message: string; part: PartDetail }> {
  return requestJson(`/parts/${encodeURIComponent(partNumber)}`, {
    method: 'PUT',
    body: JSON.stringify(changes)
  });
}
