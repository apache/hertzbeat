/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({
  actions: { discard: vi.fn(), retry: vi.fn(), save: vi.fn(), update: vi.fn() },
  state: {
    kind: 'ready' as const,
    current: {
      publicBaseUrl: 'https://hertzbeat.example.test/ops',
      serverOtlpHttpEndpoint: '',
      serverOtlpGrpcEndpoint: ''
    },
    dirty: false,
    saving: false,
    valid: true
  }
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { PublicAccessConfigSection } from './public-access-config-section';

describe('PublicAccessConfigSection', () => {
  afterEach(() => {
    cleanup();
    controller.state.current.serverOtlpHttpEndpoint = '';
    controller.state.current.serverOtlpGrpcEndpoint = '';
    vi.clearAllMocks();
  });

  it('keeps OTLP overrides collapsed until the operator opens advanced settings', () => {
    renderSection();

    const summary = screen.getByText('systemConfig.publicAccess.advancedTitle').closest('summary');
    const details = summary?.closest('details');
    expect(details).not.toHaveAttribute('open');

    fireEvent.click(summary!);

    expect(details).toHaveAttribute('open');
    expect(screen.getByText('systemConfig.publicAccess.otlpHttp')).toBeInTheDocument();
    expect(screen.getByText('systemConfig.publicAccess.otlpGrpc')).toBeInTheDocument();
  });

  it('shows derived defaults as placeholders without turning them into persisted overrides', () => {
    renderSection();

    expect(screen.getByPlaceholderText('https://hertzbeat.example.test:4318')).toHaveValue('');
    expect(screen.getByPlaceholderText('https://hertzbeat.example.test:4317')).toHaveValue('');
    expect(controller.actions.update).not.toHaveBeenCalled();
  });

  it('opens advanced settings when an OTLP override is already configured', () => {
    controller.state.current.serverOtlpHttpEndpoint = 'https://collector.example.test/v1/metrics';

    renderSection();

    expect(screen.getByText('systemConfig.publicAccess.advancedTitle').closest('details')).toHaveAttribute('open');
  });
});

function renderSection() {
  return render(<PublicAccessConfigSection canConfigure state={controller.state} actions={controller.actions} />);
}
