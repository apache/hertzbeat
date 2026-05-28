import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookies,
  buildBackendApiUrl,
  clearSessionCookies,
  readJsonPayload,
  sanitizeSessionPayload
} from '@/lib/session-bff';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const upstream = await fetch(buildBackendApiUrl('/account/auth/form'), {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      ...(request.headers.get('Accept-Language') ? { 'Accept-Language': request.headers.get('Accept-Language') as string } : {})
    },
    body: await request.text(),
    cache: 'no-store'
  });
  const payload = await readJsonPayload(upstream);
  const response = NextResponse.json(sanitizeSessionPayload(payload), { status: upstream.status });

  if (upstream.ok && payload.code === 0 && payload.data) {
    applySessionCookies(response, {
      token: typeof payload.data.token === 'string' ? payload.data.token : undefined,
      refreshToken: typeof payload.data.refreshToken === 'string' ? payload.data.refreshToken : undefined
    });
  } else {
    clearSessionCookies(response);
  }

  return response;
}
