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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init
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
