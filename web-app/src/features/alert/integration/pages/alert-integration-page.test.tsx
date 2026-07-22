/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: { source?: string }) => params?.source ?? key })
}));

import { AlertIntegrationPage } from './alert-integration-page';

describe('AlertIntegrationPage', () => {
  afterEach(cleanup);
  it('renders structured authenticated ingress guidance without claiming health', () => {
    renderPage('/alerts/integrations/webhook');

    expect(screen.getByText(`${window.location.origin}/api/alerts/report`)).toBeInTheDocument();
    expect(screen.getByText('Authorization: Bearer <api-token>')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'alertIntegrations.manageTokens' })).toHaveAttribute(
      'href',
      '/settings/tokens'
    );
    expect(screen.getByText('alertIntegrations.gatewayWarning')).toBeInTheDocument();
    expect(screen.getByText('alertIntegrations.healthDisclaimer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'alertIntegrations.manageTokens' }));
    expect(screen.getByTestId('token-target')).toBeInTheDocument();
  });

  it('switches sources through accessible controls', async () => {
    renderPage('/alerts/integrations/webhook');
    fireEvent.click(screen.getByRole('button', { name: 'alertIntegrations.sources.prometheus' }));

    await waitFor(() =>
      expect(screen.getByText(`${window.location.origin}/api/alerts/report/prometheus`)).toBeInTheDocument()
    );
  });

  it('renders the normal 404 surface for an unknown source', () => {
    renderPage('/alerts/integrations/unknown');
    expect(screen.getByRole('heading', { name: 'common.notFound.title' })).toBeInTheDocument();
  });

  it('keeps copy failure feedback on only the failed contract block', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard unavailable')) }
    });
    renderPage('/alerts/integrations/webhook');

    fireEvent.click(screen.getByRole('button', { name: 'alertIntegrations.copy: alertIntegrations.endpoint' }));

    expect(
      await screen.findByRole('button', { name: 'alertIntegrations.copyFailed: alertIntegrations.endpoint' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'alertIntegrations.copy: alertIntegrations.authorizationHeader'
      })
    ).toBeInTheDocument();
  });
});

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/alerts/integrations/:source" element={<AlertIntegrationPage />} />
        <Route path="/settings/tokens" element={<output data-testid="token-target">tokens</output>} />
      </Routes>
    </MemoryRouter>
  );
}
