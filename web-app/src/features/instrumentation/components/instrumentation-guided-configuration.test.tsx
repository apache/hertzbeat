/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { InstrumentationConfigureStep } from './instrumentation-configure-step';

afterEach(cleanup);

describe('guided instrumentation configuration', () => {
  it('keeps service identity as one focused step before destination selection', () => {
    const onNext = vi.fn();
    renderConfigure({ phase: 'service', onNext });

    expect(screen.getByRole('heading', { name: 'instrumentation.v2.guided.serviceTitle' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'instrumentation.field.serviceName' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'instrumentation.v2.destination' })).toBeNull();
    expect(screen.queryByLabelText('instrumentation.field.token')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.next' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('uses compact route rows and moves endpoint detail into the selected-route summary', () => {
    const onProfile = vi.fn();
    renderConfigure({ phase: 'destination', onProfile });

    expect(screen.getByRole('heading', { name: 'instrumentation.v2.guided.destinationTitle' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'instrumentation.v2.destination' })).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'instrumentation.v2.guided.currentIntake' })).toBeVisible();
    expect(screen.getAllByText('http://127.0.0.1:24318')).toHaveLength(1);
    expect(screen.getAllByText('http://127.0.0.1:24317')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /instrumentation\.v2\.profileKind\./ })).toHaveLength(3);
    expect(screen.queryByText('instrumentation.v2.profileOwnership.hertzbeat_collector')).toBeNull();
    expect(screen.queryByText('instrumentation.v2.profileBoundary.hertzbeat_collector')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /instrumentation\.v2\.profileKind\.hertzbeat_collector/ }));
    expect(onProfile).toHaveBeenCalledWith('collector:hybrid-local-0812');
  });

  it('guides token creation before continuing and keeps existing-token entry secondary', () => {
    const onRender = vi.fn();
    const onOpenToken = vi.fn();
    const onToken = vi.fn();
    const view = renderConfigure({ phase: 'guide', token: '', canRender: false, onOpenToken, onRender, onToken });

    expect(screen.getByRole('heading', { name: 'instrumentation.v2.guided.guideTitle' })).toBeVisible();
    expect(screen.queryByLabelText('instrumentation.field.token')).toBeNull();
    expect(screen.queryByRole('region', { name: 'instrumentation.v2.destination' })).toBeNull();
    expect(screen.getByRole('button', { name: 'instrumentation.token.create' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'instrumentation.token.useExisting' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'instrumentation.action.next' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.token.create' }));
    expect(onOpenToken).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.token.useExisting' }));
    const tokenInput = screen.getByLabelText('instrumentation.field.token');
    fireEvent.change(tokenInput, { target: { value: 'existing-token' } });
    expect(onToken).toHaveBeenCalledWith('existing-token');

    view.unmount();
    renderConfigure({
      phase: 'guide',
      token: 'generated-token',
      canRender: true,
      tokenAcknowledgementRequired: true,
      onRender
    });
    expect(screen.queryByLabelText('instrumentation.field.token')).toBeNull();
    expect(screen.getByText('instrumentation.token.readyTitle')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'instrumentation.token.create' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'instrumentation.token.useExisting' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'instrumentation.action.next' }));
    expect(onRender).toHaveBeenCalledOnce();
  });
});

type ConfigureOverrides = Partial<React.ComponentProps<typeof InstrumentationConfigureStep>>;

function renderConfigure(overrides: ConfigureOverrides) {
  return render(createConfigureStep(overrides));
}

function createConfigureStep(overrides: ConfigureOverrides) {
  const props: React.ComponentProps<typeof InstrumentationConfigureStep> = {
    phase: 'service',
    profiles: {
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'collector:hybrid-local-0812',
      profiles: [
        {
          id: 'server',
          kind: 'server',
          availability: 'unavailable',
          supportedTransports: [],
          endpoints: {},
          authorizationHeader: null,
          errorCode: 'intake_profile_not_advertised'
        },
        {
          id: 'collector:hybrid-local-0812',
          kind: 'hertzbeat_collector',
          availability: 'available',
          supportedTransports: ['http_protobuf', 'grpc'],
          endpoints: {
            http_protobuf: { url: 'http://127.0.0.1:24318', security: 'plaintext' },
            grpc: { url: 'http://127.0.0.1:24317', security: 'plaintext' }
          },
          authentication: 'bearer_token',
          authorizationHeader: 'Authorization',
          collectorId: 'hybrid-local-0812'
        },
        {
          id: 'collector:stale',
          kind: 'hertzbeat_collector',
          availability: 'unavailable',
          supportedTransports: [],
          endpoints: {},
          authorizationHeader: null,
          errorCode: 'intake_profile_not_advertised'
        }
      ]
    },
    profileId: 'collector:hybrid-local-0812',
    service: { name: 'checkout', namespace: 'default', environment: 'production' },
    platformOptions: [],
    canRender: true,
    rendering: false,
    renderError: false,
    token: 'test-token-value',
    tokenGenerating: false,
    tokenError: false,
    tokenAcknowledgementRequired: false,
    requiresToken: true,
    canGenerateToken: true,
    onProfile: vi.fn(),
    onService: vi.fn(),
    onPlatform: vi.fn(),
    onToken: vi.fn(),
    onRender: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onOpenToken: vi.fn(),
    onCloseToken: vi.fn(),
    onTokenDraft: vi.fn(),
    onGenerateToken: vi.fn(),
    onAcknowledgeToken: vi.fn(),
    ...overrides
  };
  return <InstrumentationConfigureStep {...props} />;
}
