/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { EntityDetailView } from './entity-detail-view';

const entity = { id: 7, type: 'service', name: 'checkout', environment: 'prod' };

describe('EntityDetailView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('shows real identity, health, monitor, and relation evidence', () => {
    renderView({
      kind: 'ready',
      detail: {
        entity,
        identities: [{ identityType: 'otlp', identityKey: 'service.name', identityValue: 'checkout' }],
        status: { status: 'degraded', reason: 'monitor down' },
        evidence: { logHintCount: 1 },
        boundMonitors: [{ id: 3, name: 'checkout-http', app: 'website', status: 2 }],
        relations: [{ entityName: 'payments', relationType: 'depends_on', direction: 'outgoing' }]
      }
    });
    expect(screen.getByText('service.name')).toBeInTheDocument();
    expect(screen.getByText('checkout-http')).toBeInTheDocument();
    expect(screen.getByText('depends_on')).toBeInTheDocument();
    expect(screen.getByText('monitor down')).toBeInTheDocument();
  });

  it('offers only evidence-backed Explore handoffs', () => {
    const explore = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: { entity, identities: [], evidence: { logHintCount: 1 }, boundMonitors: [], relations: [] }
      },
      explore
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.explore.logs') }));
    expect(explore).toHaveBeenCalledWith('logs');
    expect(screen.queryByRole('button', { name: i18n.t('entity.explore.metrics') })).not.toBeInTheDocument();
  });
});

function renderView(evidence: Parameters<typeof EntityDetailView>[0]['state']['evidence'], explore = () => undefined) {
  return render(
    <I18nextProvider i18n={i18n}>
      <EntityDetailView state={{ evidence }} actions={{ back: () => undefined, explore }} />
    </I18nextProvider>
  );
}
