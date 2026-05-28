import { NextRequest } from 'next/server';
import { proxyBackendApiRequest } from '@/lib/session-bff';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return proxyBackendApiRequest(request, `/${params.path?.join('/') || ''}`);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
