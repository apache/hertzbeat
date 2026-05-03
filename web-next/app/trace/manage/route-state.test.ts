import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildResetTraceManageRoute, buildTraceManageRoute } from './route-state';

function createSearchParams(input: string) {
  return new URLSearchParams(input) as unknown as { get(name: string): string | null };
}

describe('trace manage route state', () => {
  it('preserves context links when applying a trace query', () => {
    const route = buildTraceManageRoute(
      createSearchParams(
        'timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&entityId=42&entityName=checkout&returnTo=%2Foverview&returnLabel=Overview&serviceNamespace=payments&environment=prod&codeRepo=https%3A%2F%2Fexample.test%2Frepo&codeProvider=github&codePath=src%2Ftrace.ts&codeSearch=TraceService&codeLabel=source'
      ),
      {
        traceId: 'trace-123',
        spanId: 'span-456',
        serviceName: 'checkout',
        errorOnly: true
      }
    );

    expect(route).toBe(
      '/trace/manage?traceId=trace-123&spanId=span-456&serviceName=checkout&errorOnly=true&start=1713200000000&end=1713203600000&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=42&entityName=checkout&returnTo=%2Foverview&serviceNamespace=payments&environment=prod&codeRepo=https%3A%2F%2Fexample.test%2Frepo&codeProvider=github&codePath=src%2Ftrace.ts&codeSearch=TraceService&codeLabel=source'
    );
    expect(route).not.toContain('returnLabel=');
  });

  it('keeps navigation context when clearing trace filters', () => {
    const route = buildResetTraceManageRoute(
      createSearchParams('timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=UTC&returnTo=%2Fentities&returnLabel=Entities&serviceNamespace=payments&codeProvider=github')
    );

    expect(route).toBe('/trace/manage?start=1713200000000&end=1713203600000&timeRange=last-1h&refresh=30&live=false&tz=UTC&returnTo=%2Fentities&serviceNamespace=payments&codeProvider=github');
    expect(route).not.toContain('returnLabel=');
  });

  it('overrides only the shared time context when applying the visible time control', () => {
    const route = buildTraceManageRoute(
      createSearchParams(
        'timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=UTC&entityId=42&returnTo=%2Foverview&serviceNamespace=payments&environment=prod'
      ),
      {
        traceId: 'trace-123',
        spanId: '',
        serviceName: 'checkout',
        errorOnly: false
      },
      {
        timeRange: 'last-45m',
        start: '1713200900000',
        end: '1713203600000',
        refresh: '10',
        live: 'true',
        tz: 'Asia/Shanghai'
      }
    );

    expect(route).toBe(
      '/trace/manage?traceId=trace-123&serviceName=checkout&start=1713200900000&end=1713203600000&timeRange=last-45m&refresh=10&live=true&tz=Asia%2FShanghai&entityId=42&returnTo=%2Foverview&serviceNamespace=payments&environment=prod'
    );
  });

  it('delegates display-label cleanup to the shared signal route context owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/route-state.ts'), 'utf8');

    expect(source).not.toContain('removeDisplayReturnLabel');
    expect(source).not.toContain("params.delete('returnLabel')");
    expect(source).not.toContain('stripReturnLabelFromHref');
  });
});
