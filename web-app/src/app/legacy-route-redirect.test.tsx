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
    ['/ingestion/otlp?tab=java', '/observability/integration?tab=java'],
    ['/ingestion/otlp/grpc/java?tab=setup#sdk', '/observability/integration?tab=setup#sdk'],
    ['/alerts/notifications/receivers?pageIndex=2#receiver', '/settings/notifications/receivers?pageIndex=2#receiver']
  ])('redirects %s to %s', async (source, expected) => {
    renderLegacyRoutes(source);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(expected));
  });

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
