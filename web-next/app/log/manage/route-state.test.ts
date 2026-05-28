import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import { buildLogManageRoute, buildResetLogManageRoute } from './route-state';

function createSearchParams(input: string) {
  return new URLSearchParams(input) as unknown as { get(name: string): string | null };
}

describe('log manage route state', () => {
  it('preserves workbench context when applying a query', () => {
    const route = buildLogManageRoute(
      readSignalRouteContext(createSearchParams(
        'timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&entityId=42&entityName=checkout&returnTo=%2Foverview&returnLabel=Overview&serviceName=checkout&serviceNamespace=payments&environment=prod&codeRepo=https%3A%2F%2Fexample.test%2Frepo&codeProvider=github&codePath=src%2Fapp.ts&codeSearch=CheckoutService&codeLabel=source'
      )),
      {
        search: 'timeout',
        logContent: '',
        traceId: 'trace-123',
        spanId: 'span-456',
        severityNumber: '13',
        severityText: 'ERROR'
      },
      'list'
    );

    expect(route).toBe(
      '/log/manage?search=timeout&traceId=trace-123&spanId=span-456&severityNumber=13&severityText=ERROR&view=list&start=1713200000000&end=1713203600000&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=42&entityName=checkout&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod&codeRepo=https%3A%2F%2Fexample.test%2Frepo&codeProvider=github&codePath=src%2Fapp.ts&codeSearch=CheckoutService&codeLabel=source'
    );
    expect(route).not.toContain('returnLabel=');
  });

  it('keeps route context when resetting back to an empty stream query', () => {
    const route = buildResetLogManageRoute(
      readSignalRouteContext(createSearchParams('timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=UTC&returnTo=%2Fentities&returnLabel=Entities&serviceName=checkout')),
      'stream'
    );

    expect(route).toBe(
      '/log/manage?view=stream&start=1713200000000&end=1713203600000&timeRange=last-1h&refresh=30&live=false&tz=UTC&returnTo=%2Fentities&serviceName=checkout'
    );
    expect(route).not.toContain('returnLabel=');
  });

  it('overrides only the shared time context when applying the visible time control', () => {
    const route = buildLogManageRoute(
      readSignalRouteContext(createSearchParams(
        'timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=UTC&entityId=42&returnTo=%2Foverview&serviceName=checkout'
      )),
      {
        search: 'timeout',
        logContent: '',
        traceId: 'trace-123',
        spanId: '',
        severityNumber: '',
        severityText: ''
      },
      'list',
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
      '/log/manage?search=timeout&traceId=trace-123&view=list&start=1713200900000&end=1713203600000&timeRange=last-45m&refresh=10&live=true&tz=Asia%2FShanghai&entityId=42&returnTo=%2Foverview&serviceName=checkout'
    );
  });

  it('delegates display-label cleanup to the shared signal route context owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/route-state.ts'), 'utf8');

    expect(source).not.toContain('removeDisplayReturnLabel');
    expect(source).not.toContain("params.delete('returnLabel')");
    expect(source).not.toContain('stripReturnLabelFromHref');
  });
});
