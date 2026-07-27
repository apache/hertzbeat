/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import jaMessages from '@/assets/i18n/ja-jp.json';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { CollectorRuntimeApplication, CollectorRuntimeSaveState } from '../model/collector-runtime-report-model';
import { CollectorRuntimeApplicationAlert } from './collector-runtime-application-alert';

const reportedAt = '2026-07-22T10:01:05Z';
const cases: {
  application: CollectorRuntimeApplication;
  message: string;
  alertClass?: string;
}[] = [
  {
    application: { kind: 'unknown', expectedRevision: 8, reason: 'not-reported' },
    message: 'Management saved edge runtime revision 8; waiting for a Collector report.'
  },
  {
    application: {
      kind: 'waiting',
      expectedRevision: 8,
      desiredRevision: 8,
      activeRevision: 7,
      reportedAt
    },
    message: 'Management saved edge runtime revision 8; Collector reports desired 8 and active 7.'
  },
  {
    application: {
      kind: 'rejected',
      expectedRevision: 8,
      activeRevision: 7,
      failureCode: 'CONFIGURATION_ERROR',
      reportedAt
    },
    message: 'edge rejected runtime revision 8 (CONFIGURATION_ERROR); active revision remains 7.',
    alertClass: 'ant-alert-error'
  },
  {
    application: { kind: 'applied', revision: 8, state: 'DEGRADED', reportedAt },
    message: 'edge applied runtime revision 8; runtime state is DEGRADED.',
    alertClass: 'ant-alert-warning'
  },
  {
    application: { kind: 'applied', revision: 8, state: 'RUNNING', reportedAt },
    message: 'edge applied runtime revision 8; runtime state is RUNNING.',
    alertClass: 'ant-alert-success'
  }
];

describe('CollectorRuntimeApplicationAlert', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(async () => {
    cleanup();
    await loadLocale('en-US');
  });

  it.each(cases)('renders $application.kind application evidence', ({ application, message, alertClass }) => {
    renderAlert(application);
    const evidence = screen.getByText(message);
    expect(evidence).toBeInTheDocument();
    if (alertClass) expect(evidence.closest('.ant-alert')).toHaveClass(alertClass);
  });

  it('reuses the localized row state in an applied alert', async () => {
    await loadLocale('ja-JP');
    renderAlert({ kind: 'applied', revision: 8, state: 'RUNNING', reportedAt });
    expect(screen.getByRole('alert')).toHaveTextContent(jaMessages.collectors.runtime.report.state.RUNNING);
    expect(screen.getByRole('alert')).not.toHaveTextContent('RUNNING');
  });
});

function renderAlert(application: CollectorRuntimeApplication) {
  const state: CollectorRuntimeSaveState = {
    kind: 'management-saved',
    collector: 'edge',
    revision: 8,
    application
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <CollectorRuntimeApplicationAlert state={state} />
    </I18nextProvider>
  );
}
