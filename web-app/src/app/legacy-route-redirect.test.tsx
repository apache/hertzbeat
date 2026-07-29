/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LegacyRouteRedirect } from './legacy-route-redirect';
import { legacyRouteCatalog } from './route-registry';

describe('LegacyRouteRedirect', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    ['/overview?theme=compact#summary', '/dashboard?theme=compact#summary'],
    [
      '/log/stream?signal=traces&mode=history&service=checkout#tail',
      '/explore?signal=logs&mode=live&service=checkout#tail'
    ],
    ['/log/integration/filebeat?tab=setup#agent', '/observability/integration?tab=setup#agent'],
    ['/log/manage?service=checkout', '/explore?signal=logs&service=checkout'],
    ['/metrics/manage?signal=logs&service=checkout#chart', '/explore?signal=metrics&service=checkout#chart'],
    ['/trace/manage?signal=logs&service=checkout#span', '/explore?signal=traces&service=checkout#span'],
    ['/log?tab=setup#agent', '/observability/integration?tab=setup#agent'],
    ['/ingestion/otlp?tab=java', '/observability/integration?tab=java'],
    ['/ingestion/otlp/grpc/java?tab=setup#sdk', '/observability/integration?tab=setup#sdk'],
    ['/alert?status=firing#active', '/alerts?status=firing#active'],
    ['/alert/center?status=pending', '/alerts?status=pending'],
    ['/alert/setting?search=latency', '/alerts/rules?search=latency'],
    ['/alert/notice?pageIndex=2', '/settings/notifications/receivers?pageIndex=2'],
    ['/alert/silence?search=maintenance', '/alerts/silences?search=maintenance'],
    ['/alert/group?search=platform', '/alerts/groups?search=platform'],
    ['/alert/inhibit?search=dependency', '/alerts/inhibits?search=dependency'],
    ['/alerts/notifications/receivers?pageIndex=2#receiver', '/settings/notifications/receivers?pageIndex=2#receiver'],
    ['/alerts/notifications/templates?channel=email', '/settings/notifications/templates?channel=email'],
    ['/alerts/notifications/rules?enabled=true', '/settings/notifications/rules?enabled=true'],
    ['/setting/settings/server?type=email', '/settings/notifications/channels?type=email'],
    ['/setting/settings/config?tab=mail', '/settings/system?tab=mail'],
    ['/setting/settings/object-store?tab=s3', '/settings/storage/object-store?tab=s3'],
    ['/setting/labels?search=production', '/settings/labels?search=production'],
    ['/setting/plugin?search=jdbc', '/settings/plugins?search=jdbc'],
    ['/setting/plugins?search=jdbc', '/settings/plugins?search=jdbc'],
    ['/setting/settings?tab=mail', '/settings/system?tab=mail'],
    ['/setting/settings/token?pageIndex=2', '/settings/tokens?pageIndex=2'],
    [
      '/setting/collector?pageIndex=2&status=online#collector-7',
      '/settings/collectors?pageIndex=2&status=online#collector-7'
    ],
    ['/setting/define?app=linux', '/settings/monitor-definitions?app=linux'],
    ['/setting/status?workspace=default', '/settings/status-page?workspace=default']
  ])('redirects %s to %s', async (source, expected) => {
    renderLegacyRoutes(source);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(expected));
  });

  it.each([
    ['/alert/integration/webhook?tab=setup#receiver', '/alerts/integrations/webhook?tab=setup#receiver'],
    ['/alert/integration/otel%2Fhttp', '/alerts/integrations/otel%2Fhttp'],
    ['/alert/integration/otel%252Fhttp', '/alerts/integrations/otel%2Fhttp'],
    ['/alert/integration/%2E%2E', '/alerts/integrations/%2E%2E']
  ])(
    'redirects the decoded integration source in %s to one safely encoded target segment',
    async (source, expected) => {
      renderLegacyRoutes(source);

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(expected));
      expect(screen.getByTestId('location')).not.toHaveTextContent(':source');
    }
  );

  it('drops secret-like search and hash fields without logging their values', async () => {
    const secret = 'must-not-leak';
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderLegacyRoutes(
      `/log/stream?service=checkout&token=${secret}&authorization=${secret}&apiKey=${secret}&api_key=${secret}` +
        `&headers=${secret}&otlpHeaders=${secret}#?tab=tail&token=${secret}&headers=${secret}`
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/explore?signal=logs&mode=live&service=checkout#?tab=tail'
      )
    );
    expect(screen.getByTestId('location')).not.toHaveTextContent(secret);
    expect(
      JSON.stringify([...log.mock.calls, ...info.mock.calls, ...warn.mock.calls, ...error.mock.calls])
    ).not.toContain(secret);
  });

  it('drops external redirect parameters while retaining sanitized local navigation context', async () => {
    renderLegacyRoutes(
      '/overview?redirect=https%3A%2F%2Fevil.example&returnTo=%2Fsettings%2Flabels%3Ftoken%3Dsecret&theme=compact'
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard?returnTo=%2Fsettings%2Flabels&theme=compact')
    );
    expect(screen.getByTestId('location')).not.toHaveTextContent('evil.example');
    expect(screen.getByTestId('location')).not.toHaveTextContent('secret');
  });

  it.each(['/actions', '/incidents', '/events', '/ai', '/mcp', '/ui-lab'])(
    'leaves excluded route %s on the not-found path',
    async source => {
      renderLegacyRoutes(source);
      await waitFor(() => expect(screen.getByTestId('not-found')).toBeInTheDocument());
    }
  );
});

function renderLegacyRoutes(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {legacyRouteCatalog.map(definition => (
          <Route key={definition.id} path={definition.path} element={<LegacyRouteRedirect definition={definition} />} />
        ))}
        <Route path="/dashboard" element={<LocationProbe />} />
        <Route path="/explore" element={<LocationProbe />} />
        <Route path="/observability/integration" element={<LocationProbe />} />
        <Route path="/alerts/*" element={<LocationProbe />} />
        <Route path="/settings/*" element={<LocationProbe />} />
        <Route path="*" element={<output data-testid="not-found">not found</output>} />
      </Routes>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}
