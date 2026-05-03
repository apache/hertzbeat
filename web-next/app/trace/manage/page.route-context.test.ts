import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('trace manage page route-context wiring', () => {
  it('threads signal-route context into trace API url construction for seeded parity routes', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');

    expect(source).toContain('const routeContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);');
    expect(source).toContain('const traceUrls = useMemo(() => buildTraceUrls(query, routeContext), [query, routeContext]);');
  });
});
