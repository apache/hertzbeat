/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { DeploymentWorkflow } from './deployment-workflow';

describe('DeploymentWorkflow', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(cleanup);

  it('shows unavailable maintenance admission as a blocker without a fake switch', () => {
    renderWorkflow({
      maintenanceMode: 'inactive',
      migration: {
        allowed: false,
        blockedBy: 'migration_maintenance_required',
        maintenanceAdmission: 'unavailable',
        activeOperationId: null
      }
    });

    expect(screen.getAllByText('Maintenance mode is inactive')).toHaveLength(2);
    expect(screen.getByText(/automatic maintenance admission is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start migration' })).toBeDisabled();
  });

  it('presents server-owned automatic maintenance admission as acknowledgement, never as a switch', () => {
    renderWorkflow({
      deployment: {
        ...baseProps.deployment,
        maintenanceMode: 'inactive',
        migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'auto_enter', activeOperationId: null }
      }
    });

    expect(
      screen.getByRole('checkbox', { name: /starting migration will automatically enter maintenance mode/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('offers the authoritative active operation instead of guessing durable state', () => {
    const continueCurrentMigration = vi.fn();
    renderWorkflow({
      deployment: {
        ...baseProps.deployment,
        migration: {
          allowed: false,
          blockedBy: 'operation_conflict',
          maintenanceAdmission: 'unavailable',
          activeOperationId: 'migration-current'
        }
      },
      continueCurrentMigration
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue current migration' }));
    expect(continueCurrentMigration).toHaveBeenCalledOnce();
  });

  it('requires explicit acknowledgement after validation before starting', () => {
    const start = vi.fn();
    const setMaintenanceAcknowledged = vi.fn();
    renderWorkflow({
      validation: { valid: true, observedAt: '2026-08-09T01:00:00Z', errorCode: null, warnings: [] },
      setMaintenanceAcknowledged,
      start
    });

    expect(screen.getByRole('button', { name: 'Start migration' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand monitoring writes must remain paused/i }));
    expect(setMaintenanceAcknowledged).toHaveBeenCalledWith(true);
    cleanup();
    renderWorkflow({
      validation: { valid: true, observedAt: '2026-08-09T01:00:00Z', errorCode: null, warnings: [] },
      maintenanceAcknowledged: true,
      canStart: true,
      start
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start migration' }));
    expect(start).toHaveBeenCalledTimes(1);

    cleanup();
    renderWorkflow({ busy: true, busyAction: 'validate', canValidate: false });
    expect(screen.getByRole('button', { name: /Validate target/ })).toHaveClass('ant-btn-loading');
    expect(screen.getByRole('button', { name: /Start migration/ })).not.toHaveClass('ant-btn-loading');
  });

  it.each([
    ['external_apply_required', 'External configuration must still be applied.'],
    ['restart_required', 'A server restart is still required.'],
    ['public_address_plaintext', 'The public address uses unencrypted HTTP.'],
    ['mail_security_none', 'Mail transport encryption is disabled.'],
    ['h2_non_production', 'The H2 database is intended only for local evaluation.']
  ] as const)('renders allowlisted validation warning %s', (warning, message) => {
    renderWorkflow({
      validation: { valid: true, observedAt: '2026-08-09T01:00:00Z', errorCode: null, warnings: [warning] }
    });

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('offers activation only for managed ready state', () => {
    const activate = vi.fn();
    renderWorkflow({ operation: readyOperation, canActivate: true, activate });

    fireEvent.click(screen.getByRole('button', { name: 'Activate managed configuration' }));
    expect(activate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument();
  });

  it('keeps the active activation command visible, disabled, and loading', () => {
    renderWorkflow({
      operation: readyOperation,
      canActivate: false,
      busy: true,
      busyAction: 'activate'
    });

    const activate = screen.getByRole('button', { name: /Activate managed configuration/ });
    expect(activate).toBeDisabled();
    expect(activate).toHaveClass('ant-btn-loading');
  });

  it('offers export but never activation for external apply', () => {
    const exportConfiguration = vi.fn();
    renderWorkflow({
      deployment: { ...baseProps.deployment, applyMode: 'external_apply' },
      operation: {
        ...readyOperation,
        state: 'awaiting_external_apply',
        stage: 'awaiting_external_apply',
        activationAvailable: false,
        externalApplyRequired: true
      },
      canExport: true,
      exportConfiguration
    });

    fireEvent.change(screen.getByLabelText('Export password'), { target: { value: 'one-shot-secret' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Export format' }));
    fireEvent.click(screen.getByText('Environment variables'));
    fireEvent.click(screen.getByRole('button', { name: 'Export configuration' }));
    expect(exportConfiguration).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Activate managed configuration' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check migration status' })).toBeInTheDocument();
  });

  it.each([
    ['failed', 'Start a new migration'],
    ['rolled_back', 'Retry migration'],
    ['succeeded', 'Return to current configuration']
  ] as const)('offers explicit recovery for %s without presenting another lifecycle command', (state, label) => {
    const startNewMigration = vi.fn();
    renderWorkflow({ operation: { ...readyOperation, ...terminalFields(state) }, startNewMigration });

    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(startNewMigration).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Activate managed configuration' })).not.toBeInTheDocument();
    if (state === 'rolled_back') expect(screen.getByRole('progressbar')).toHaveClass('ant-progress-status-exception');
  });
});

function terminalFields(state: 'failed' | 'rolled_back' | 'succeeded') {
  if (state === 'succeeded')
    return { state, stage: 'completed' as const, completedAt: '2026-08-09T01:01:00Z', activationAvailable: false };
  return {
    state,
    stage: state === 'failed' ? ('failed' as const) : ('rolled_back' as const),
    completedAt: '2026-08-09T01:01:00Z',
    errorCode: 'migration_copy_failed' as const,
    activationAvailable: false
  };
}

const readyOperation = {
  operationId: 'migration-1',
  state: 'ready_to_activate' as const,
  source: 'h2' as const,
  target: 'mysql' as const,
  stage: 'ready_to_activate' as const,
  progressPercent: 100,
  createdAt: '2026-08-09T01:00:00Z',
  startedAt: '2026-08-09T01:00:01Z',
  completedAt: null,
  verificationState: 'succeeded' as const,
  errorCode: null,
  nextPollAfterMillis: 0,
  activationAvailable: true,
  restartRequired: false,
  externalApplyRequired: false
};

const baseProps = {
  deployment: {
    observedAt: '2026-08-09T01:00:00Z',
    managementDatabase: {
      kind: 'h2' as const,
      configured: true,
      source: 'ui_managed' as const,
      restartRequired: false
    },
    greptimeDatabase: {
      kind: 'greptime' as const,
      configured: true,
      source: 'environment' as const,
      restartRequired: false
    },
    applyMode: 'managed_write' as const,
    maintenanceMode: 'active' as const,
    topology: 'single_node' as const,
    migration: {
      allowed: true,
      blockedBy: null,
      maintenanceAdmission: 'use_current' as const,
      activeOperationId: null
    }
  },
  draft: {
    target: 'mysql' as const,
    targetDatabase: { kind: 'mysql' as const, jdbcUrl: 'jdbc:mysql://db/hb', username: 'hb', password: 'secret' },
    applyMode: 'managed_write' as const
  },
  validation: null,
  operation: null,
  busy: false,
  busyAction: null,
  canValidate: true,
  canStart: false,
  canActivate: false,
  canExport: false,
  exportFormat: 'yaml' as const,
  exportPassword: '',
  updateDraft: vi.fn(),
  updateExportFormat: vi.fn(),
  updateExportPassword: vi.fn(),
  validate: vi.fn(),
  start: vi.fn(),
  activate: vi.fn(),
  exportConfiguration: vi.fn(),
  refreshOperation: vi.fn(),
  startNewMigration: vi.fn(),
  continueCurrentMigration: vi.fn()
};

function renderWorkflow(overrides: Record<string, unknown> = {}) {
  const deploymentOverride = overrides.deployment as typeof baseProps.deployment | undefined;
  const maintenanceMode = overrides.maintenanceMode as 'active' | 'inactive' | undefined;
  const deploymentFields = overrides.maintenanceMode
    ? {
        maintenanceMode: maintenanceMode ?? baseProps.deployment.maintenanceMode,
        migration: overrides.migration as typeof baseProps.deployment.migration
      }
    : {};
  return render(
    <I18nextProvider i18n={i18n}>
      <DeploymentWorkflow
        {...baseProps}
        {...overrides}
        deployment={{ ...baseProps.deployment, ...deploymentFields, ...deploymentOverride }}
      />
    </I18nextProvider>
  );
}
