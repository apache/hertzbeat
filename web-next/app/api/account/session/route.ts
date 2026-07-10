import { NextRequest, NextResponse } from 'next/server';
import {
  HB_UI_ACCESS_COOKIE,
  HB_UI_REFRESH_COOKIE,
  clearSessionCookies,
  readSessionCookieValue
} from '@/lib/session-bff';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: Boolean(
      readSessionCookieValue(request, HB_UI_ACCESS_COOKIE) ||
      readSessionCookieValue(request, HB_UI_REFRESH_COOKIE)
    )
  });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ authenticated: false });
  clearSessionCookies(response, request);
  return response;
}
