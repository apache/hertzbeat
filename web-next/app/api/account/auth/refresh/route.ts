import { NextRequest, NextResponse } from 'next/server';
import {
  HB_UI_REFRESH_COOKIE,
  applySessionCookies,
  buildBackendApiUrl,
  clearSessionCookies,
  readJsonPayload,
  readSessionCookieValue,
  sanitizeSessionPayload
} from '@/lib/session-bff';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const refreshToken = readSessionCookieValue(request, HB_UI_REFRESH_COOKIE);
  if (!refreshToken) {
    const response = NextResponse.json({ code: 401, msg: 'Missing refresh session', data: null }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const upstream = await fetch(buildBackendApiUrl('/account/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.get('Accept-Language') ? { 'Accept-Language': request.headers.get('Accept-Language') as string } : {})
    },
    body: JSON.stringify({ token: refreshToken }),
    cache: 'no-store'
  });
  const payload = await readJsonPayload(upstream);
  const response = NextResponse.json(sanitizeSessionPayload(payload), { status: upstream.status });

  if (upstream.ok && payload.code === 0 && payload.data) {
    applySessionCookies(response, {
      token: typeof payload.data.token === 'string' ? payload.data.token : undefined,
      refreshToken: typeof payload.data.refreshToken === 'string' ? payload.data.refreshToken : refreshToken
    });
  } else {
    clearSessionCookies(response);
  }

  return response;
}
