// Functions that call the backend live here. Add new API calls next to this one.

import type { ApiFieldError, CatchRecord, CatchRecordInput } from './types.ts';

export interface VersionInfo {
  name: string;
  version: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message = `Request failed with status ${status}`) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

export function isApiFieldError(body: unknown): body is ApiFieldError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'field' in body &&
    'message' in body &&
    typeof (body as { field: unknown }).field === 'string' &&
    typeof (body as { message: unknown }).message === 'string'
  );
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await readJsonSafely(response);
  if (!response.ok) {
    throw new ApiRequestError(response.status, body);
  }
  return body as T;
}

async function requestVoid(url: string, init?: RequestInit): Promise<void> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await readJsonSafely(response);
    throw new ApiRequestError(response.status, body);
  }
}

export async function fetchVersion(signal?: AbortSignal): Promise<VersionInfo> {
  // A relative URL: in development Vite forwards /api/* to the Express server.
  return requestJson<VersionInfo>('/api/version', { signal });
}

export async function fetchCatchRecords(signal?: AbortSignal): Promise<CatchRecord[]> {
  return requestJson<CatchRecord[]>('/api/catch-records', { signal });
}

export async function createCatchRecord(input: CatchRecordInput): Promise<CatchRecord> {
  return requestJson<CatchRecord>('/api/catch-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateCatchRecord(id: string, input: CatchRecordInput): Promise<CatchRecord> {
  return requestJson<CatchRecord>(`/api/catch-records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteCatchRecord(id: string): Promise<void> {
  await requestVoid(`/api/catch-records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
