/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { DetectionResponse } from '../model/instrumentation-v2-contract';
import { InstrumentationDetectionPanel } from './instrumentation-detection-panel';

const start = Date.parse('2026-09-05T10:00:00Z');
const context = {
  sourceKind: 'quick_start' as const,
  service: { name: 'checkout', namespace: 'commerce', environment: 'production' },
  intakeProfileId: 'server-default',
  startedAt: start,
  windowEndAt: start + 120_000
};
const jumpContext = {
  serviceName: 'checkout',
  intakeProfileId: 'server-default',
  startedAt: start,
  detectedAt: start + 60_000
};
const response: DetectionResponse = {
  schemaVersion: 2,
  detectedAt: start + 60_000,
  context,
  signals: {
    metrics: { status: 'received', lastReceivedAt: start + 30_000 },
    logs: { status: 'waiting', errorCode: 'signal_not_received' },
    traces: { status: 'unsupported', errorCode: 'signal_not_supported' }
  },
  polling: { decision: 'manual_retry', deadlineAt: start + 120_000 },
  queryJumpContext: jumpContext,
  queryJumps: [{ signal: 'metrics', enabled: true, context: jumpContext }]
};

describe('fixed-window signal observation', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('explains historical reception and gives retry and a fresh check distinct actions', () => {
    const onRetry = vi.fn(),
      onNewCheck = vi.fn();
    renderPanel(false, onRetry, onNewCheck);
    expect(screen.getByText(i18n.t('instrumentation.detection.observationOnly'))).toBeVisible();
    expect(
      screen.getByText(
        i18n.t('instrumentation.detection.fixedWindow', {
          start: new Date(start).toISOString(),
          end: new Date(start + 120_000).toISOString()
        })
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        i18n.t('instrumentation.detection.lastReceived', { time: new Date(start + 30_000).toISOString() })
      )
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('instrumentation.action.retryDetection') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('instrumentation.action.newDetection') }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onNewCheck).toHaveBeenCalledOnce();
  });

  it('does not invite a new check while the current check is polling', () => {
    renderPanel(true, vi.fn(), vi.fn());
    expect(screen.getByRole('button', { name: i18n.t('instrumentation.action.newDetection') })).toBeDisabled();
  });

  it('reports no observed data after the fixed window ends without claiming the source stopped', () => {
    renderPanel(false, vi.fn(), vi.fn(), { ...response, detectedAt: context.windowEndAt });
    expect(screen.getByText(i18n.t('instrumentation.detection.windowComplete'))).toBeVisible();
    expect(screen.getByText(i18n.t('instrumentation.detection.notObserved'))).toBeVisible();
    expect(screen.getByText(i18n.t('instrumentation.detection.noneInWindow'))).toBeVisible();
    expect(screen.queryByText(i18n.t('instrumentation.detection.status.waiting'))).toBeNull();
  });
});

function renderPanel(detecting: boolean, onRetry: () => void, onNewCheck: () => void, evidence = response) {
  render(
    <I18nextProvider i18n={i18n}>
      <InstrumentationDetectionPanel
        response={evidence}
        detecting={detecting}
        error={false}
        onRetry={onRetry}
        onNewCheck={onNewCheck}
        onOpen={vi.fn()}
      />
    </I18nextProvider>
  );
}
