import { NextResponse } from 'next/server';

// Standard JSON error helper to keep API error shapes consistent
export function jsonError(message: string, opts?: { status?: number; details?: unknown }) {
  const { status = 500, details } = opts || {};
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined
        ? { details: details instanceof Error ? details.message : String(details) }
        : {}),
    },
    { status }
  );
}

export function upstreamError(source: string, err: unknown, status = 502) {
  return jsonError(`Upstream ${source} failed`, { status, details: err });
}
