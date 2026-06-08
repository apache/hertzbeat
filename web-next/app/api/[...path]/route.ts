import { NextRequest } from 'next/server';
import { proxyBackendApiRequest } from '@/lib/session-bff';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function backendPathFromRequest(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const apiPrefix = '/api';
  if (pathname === apiPrefix) {
    return '/';
  }
  if (pathname.startsWith(`${apiPrefix}/`)) {
    return pathname.slice(apiPrefix.length);
  }
  return pathname;
}

async function proxy(request: NextRequest, context: RouteContext) {
  await context.params;
  return proxyBackendApiRequest(request, backendPathFromRequest(request));
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
