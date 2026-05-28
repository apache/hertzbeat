import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('trace manage page route-context wiring', () => {
  it('threads signal-route context into trace API url construction for seeded parity routes', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');

    expect(source).toContain('const traceManageRouteState = initialRouteState ?? EMPTY_TRACE_MANAGE_ROUTE_STATE');
    expect(source).toContain('const routeContext = traceManageRouteState.routeContext;');
    expect(source).toContain('const traceUrls = useMemo(() => buildTraceUrls(query, routeContext), [query, routeContext]);');
  });
});
