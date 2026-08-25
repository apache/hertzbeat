/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { DeploymentView } from '../model/deployment-contract';
import { DeploymentSummary } from './deployment-summary';

describe('DeploymentSummary', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('leads with one deployment sentence and keeps the full read-only evidence behind an explicit disclosure', () => {
    const { container } = renderSummary(deployment);

    expect(
      screen.getByText(
        'Management data is stored in H2 and telemetry data in GreptimeDB; configuration is managed by HertzBeat, running in single-node mode.'
      )
    ).toBeVisible();
    expect(screen.getByText('Database connections')).toBeVisible();
    expect(screen.getByText('Configuration management')).toBeVisible();
    expect(screen.getByText('Maintenance mode')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Management database' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View current configuration' }));

    expect(screen.getByRole('button', { name: 'Hide current configuration' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Management database' })).toHaveTextContent(
      'Management databaseStores accounts, monitors, alerts, and system configurationH2Built-in default'
    );
    expect(screen.getByRole('group', { name: 'GreptimeDB telemetry database' })).toHaveTextContent(
      'GreptimeDB telemetry databaseStores metrics, logs, and tracesGreptimeDBCommand line'
    );
    expect(screen.getByText('Managed configuration')).toBeVisible();
    expect(screen.getByText('Maintenance mode is inactive')).toBeVisible();
    expect(screen.getByText('Single node')).toBeVisible();
    expect(container.querySelector('table')).not.toBeInTheDocument();
    expect(container.querySelector('.ant-descriptions')).not.toBeInTheDocument();
  });
});

function renderSummary(value: DeploymentView) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DeploymentSummary deployment={value} />
    </I18nextProvider>
  );
}

const deployment: DeploymentView = {
  observedAt: '2026-08-24T12:00:00Z',
  managementDatabase: { kind: 'h2', configured: true, source: 'built_in_default', restartRequired: false },
  greptimeDatabase: { kind: 'greptime', configured: true, source: 'command_line', restartRequired: false },
  applyMode: 'managed_write',
  maintenanceMode: 'inactive',
  topology: 'single_node',
  migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'auto_enter', activeOperationId: null }
};
