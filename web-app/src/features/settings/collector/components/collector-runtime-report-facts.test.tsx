/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { CollectorRuntimeReport } from '../model/collector-runtime-report-model';
import { CollectorRuntimeReportFacts } from './collector-runtime-report-facts';

const report: CollectorRuntimeReport = {
  schemaVersion: 2,
  enabled: true,
  state: 'RUNNING',
  desiredRevision: 8,
  activeRevision: 8,
  failureCode: 'NONE',
  rejectedRevisions: [],
  sources: [],
  reportedAt: '2026-07-22T10:01:05Z'
};

describe('CollectorRuntimeReportFacts', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('renders an explicit no-report fact', () => {
    renderFacts(null);
    expect(screen.getByText('Not reported')).toBeInTheDocument();
  });

  it.each(['RUNNING', 'DEGRADED', 'FAILED'] as const)('renders the reported runtime state %s', state => {
    renderFacts({ ...report, state });
    expect(screen.getByText(state)).toBeInTheDocument();
  });

  it('renders revision lag and localized report time', () => {
    renderFacts({ ...report, activeRevision: 7 });
    expect(screen.getByText('Desired 8 · Active 7')).toBeInTheDocument();
    expect(screen.getByText(`Reported ${formatTime(report.reportedAt)}`)).toBeInTheDocument();
  });

  it('shows only a non-NONE safe failure code', () => {
    const { rerender } = renderFacts(report);
    expect(screen.queryByText('Failure NONE')).not.toBeInTheDocument();
    rerender(
      <I18nextProvider i18n={i18n}>
        <CollectorRuntimeReportFacts report={{ ...report, failureCode: 'PORT_CONFLICT' }} />
      </I18nextProvider>
    );
    expect(screen.getByText('Failure PORT_CONFLICT')).toBeInTheDocument();
  });

  it('bounds a 49-source table fact while keeping the complete safe list accessible', () => {
    const sources: CollectorRuntimeReport['sources'] = [
      { type: 'HOST_METRICS', name: 'host', revision: 8, state: 'ACTIVE' },
      ...Array.from({ length: 32 }, (_, index) => ({
        type: 'PROMETHEUS' as const,
        name: `prometheus-${index + 1}`,
        revision: 8,
        state: 'REJECTED' as const
      })),
      ...Array.from({ length: 16 }, (_, index) => ({
        type: 'FILE_LOG' as const,
        name: `file-log-${index + 1}`,
        revision: 9,
        state: 'DESIRED' as const
      }))
    ];
    renderFacts({
      ...report,
      sources
    });

    expect(screen.getByText('Sources: 49 · Active 1 · Desired 16 · Rejected 32')).toBeInTheDocument();
    expect(screen.getByText('Prometheus: prometheus-1 · REJECTED · Revision 8')).not.toBeVisible();
    const list = screen.getByRole('list', { name: 'Runtime sources' });
    const summary = screen.getByText('View 49 sources');
    const disclosure = summary.closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    expect(list).not.toBeVisible();

    fireEvent.click(summary);

    expect(disclosure).toHaveAttribute('open');
    expect(list).toBeVisible();
    expect(within(list).getAllByRole('listitem')).toHaveLength(49);
    expect(within(list).getByText('Host Metrics: host · ACTIVE · Revision 8')).toBeInTheDocument();
    expect(within(list).getByText('Prometheus: prometheus-32 · REJECTED · Revision 8')).toBeInTheDocument();
    expect(within(list).getByText('File Log: file-log-16 · DESIRED · Revision 9')).toBeInTheDocument();

    fireEvent.click(summary);
    expect(disclosure).not.toHaveAttribute('open');
    expect(list).not.toBeVisible();
  });
});

function renderFacts(value: CollectorRuntimeReport | null) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CollectorRuntimeReportFacts report={value} />
    </I18nextProvider>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(Date.parse(value));
}
