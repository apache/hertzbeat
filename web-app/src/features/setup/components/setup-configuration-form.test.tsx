/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { initializeI18n } from '@/core/i18n/i18n';

import { createSetupConfigurationDraft, type SetupConfigurationDraft } from '../model/setup-configuration';
import type {
  SetupConfigurationWorkflowState,
  SetupRequestFailure,
  SetupSectionValidationMap
} from '../model/setup-configuration-state';
import { SetupConfigurationForm } from './setup-configuration-form';

describe('SetupConfigurationForm', () => {
  beforeAll(() => initializeI18n());
  afterEach(cleanup);

  it('distinguishes management data from Greptime telemetry and warns about H2', () => {
    renderForm();
    const management = screen.getByRole('region', { name: 'HertzBeat management database' });
    const telemetry = screen.getByRole('region', { name: 'GreptimeDB telemetry store' });

    expect(within(management).getByText(/users, monitors, alerts/i)).toBeInTheDocument();
    expect(within(management).getByText(/evaluation only/i)).toBeInTheDocument();
    expect(within(telemetry).getByText(/metrics, logs, and traces/i)).toBeInTheDocument();
    expect(within(telemetry).getByLabelText('gRPC endpoints')).toBeInTheDocument();
    expect(within(telemetry).getByLabelText('HTTP endpoint')).toBeInTheDocument();
  });

  it('uses product display names for every supported management database kind', async () => {
    renderForm();
    const management = screen.getByRole('region', { name: 'HertzBeat management database' });
    const databaseKind = within(management).getByRole('combobox');
    expect(databaseKind).toHaveAttribute('aria-label', 'Database type');
    fireEvent.mouseDown(databaseKind);
    expect(await screen.findByText('MySQL')).toBeInTheDocument();
    expect(await screen.findByText('PostgreSQL')).toBeInTheDocument();
  });

  it('replaces the H2 connection fields when the management database kind changes', async () => {
    const updateManagement = vi.fn();
    render(
      formFixture(
        { metadata_database: { state: 'idle' }, telemetry_store: { state: 'idle' } },
        null,
        'editing',
        createSetupConfigurationDraft(),
        updateManagement
      )
    );
    const management = screen.getByRole('region', { name: 'HertzBeat management database' });
    fireEvent.mouseDown(within(management).getByRole('combobox'));
    fireEvent.click(await screen.findByText('MySQL'));

    expect(updateManagement).toHaveBeenCalledWith({ kind: 'mysql', jdbcUrl: '', username: '', password: '' });

    const mysqlDraft = createSetupConfigurationDraft();
    mysqlDraft.managementDatabase = { kind: 'mysql', jdbcUrl: '', username: '', password: '' };
    cleanup();
    render(
      formFixture(
        { metadata_database: { state: 'idle' }, telemetry_store: { state: 'idle' } },
        null,
        'editing',
        mysqlDraft
      )
    );
    expect(screen.getByLabelText('JDBC URL')).toHaveAttribute('placeholder', 'jdbc:mysql://host:3306/hertzbeat');
  });

  it.each([
    ['metadata_connection_failed', 'Management database connection failed'],
    ['metadata_kind_unsupported', 'Management database type is not supported'],
    ['metadata_schema_mismatch', 'Management database schema is not compatible'],
    ['metadata_insufficient_privileges', 'Management database user has insufficient privileges']
  ] as const)('renders stable section evidence for %s', (errorCode, message) => {
    renderForm({
      metadata_database: {
        state: 'complete',
        valid: false,
        observedAt: '2026-08-08T06:00:00Z',
        errorCode,
        warnings: []
      }
    });
    const management = screen.getByRole('region', { name: 'HertzBeat management database' });
    expect(within(management).getByRole('alert')).toHaveTextContent(message);
  });

  it('freezes a section while checking and requires both successful validations before apply', () => {
    const { rerender } = renderForm({ metadata_database: { state: 'checking' } });
    expect(screen.getByLabelText('JDBC URL')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply configuration' })).toBeDisabled();

    rerender(formFixture(validValidation()));
    expect(screen.getByRole('button', { name: 'Apply configuration' })).toBeEnabled();
  });

  it('disables section validation for incomplete required fields and half-filled telemetry credentials', () => {
    const draft = completeDraft();
    draft.managementDatabase.username = '';
    draft.telemetryStore.password = '';
    render(formFixture(validValidation(), null, 'editing', draft));
    const management = screen.getByRole('region', { name: 'HertzBeat management database' });
    const telemetry = screen.getByRole('region', { name: 'GreptimeDB telemetry store' });
    expect(within(management).getByLabelText('Username')).toBeRequired();
    expect(within(management).getByLabelText('Password')).toBeRequired();
    expect(within(management).getByRole('button', { name: 'Validate connection' })).toBeDisabled();
    expect(within(telemetry).getByRole('button', { name: 'Validate connection' })).toBeDisabled();
    expect(within(telemetry).getByText(/must be provided together/i)).toBeInTheDocument();
  });

  it.each([
    ['config_read_only', /managed configuration is read-only/i],
    ['config_write_failed', /could not write the managed configuration/i],
    ['config_recovery_required', /requires server recovery/i],
    ['operation_conflict', /another setup operation is already active/i],
    ['invalid_request', /setup request is invalid/i],
    ['internal_error', /setup service encountered an internal error/i]
  ] as const)('renders stable safe configuration feedback for %s', (errorCode, message) => {
    render(formFixture(validValidation(), { failure: 'error', errorCode }));
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('does not present a polling failure as normal waiting', () => {
    render(formFixture(validValidation(), null, 'poll-unavailable'));
    expect(screen.getByText(/operation status is temporarily unavailable/i)).toBeInTheDocument();
  });

  it('keeps the refresh recovery form editable and asks for every value again', () => {
    const draft = createSetupConfigurationDraft();
    draft.managementDatabase = { kind: null, jdbcUrl: '', username: '', password: '' };
    draft.telemetryStore = {
      kind: 'greptime',
      grpcEndpoints: '',
      httpEndpoint: '',
      database: '',
      username: '',
      password: ''
    };
    render(
      formFixture(
        { metadata_database: { state: 'idle' }, telemetry_store: { state: 'idle' } },
        null,
        'external-resume',
        draft
      )
    );

    expect(screen.getByText(/re-enter every connection field/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Database type' })).toBeEnabled();
    expect(screen.getByText('Select a database type')).toBeInTheDocument();
    expect(screen.getByLabelText('JDBC URL')).toHaveValue('');
    expect(screen.getAllByLabelText('Password')).toHaveLength(2);
  });
});

function renderForm(validation: Partial<SetupSectionValidationMap> = {}) {
  const validationState: SetupSectionValidationMap = {
    metadata_database: { state: 'idle' },
    telemetry_store: { state: 'idle' },
    ...validation
  };
  return render(formFixture(validationState));
}

function formFixture(
  validation: SetupSectionValidationMap,
  submitFailure: SetupRequestFailure | null = null,
  workflowState: SetupConfigurationWorkflowState = 'editing',
  draft: SetupConfigurationDraft = createSetupConfigurationDraft(),
  updateManagement = vi.fn()
) {
  const canSubmit = Object.values(validation).every(item => item.state === 'complete' && item.valid);
  return (
    <AppProviders>
      <SetupConfigurationForm
        applyMode="managed_write"
        draft={draft}
        workflowState={workflowState}
        canSubmit={canSubmit}
        canExport={false}
        exporting={false}
        exportFailure={null}
        submitting={false}
        submitFailure={submitFailure}
        validation={validation}
        updateManagement={updateManagement}
        updateTelemetry={vi.fn()}
        validateSection={vi.fn()}
        submit={vi.fn()}
        exportConfiguration={vi.fn()}
      />
    </AppProviders>
  );
}

function completeDraft() {
  const draft = createSetupConfigurationDraft();
  return {
    managementDatabase: { ...draft.managementDatabase },
    telemetryStore: {
      ...draft.telemetryStore,
      grpcEndpoints: 'greptime:4001',
      httpEndpoint: 'http://greptime:4000',
      username: 'greptime',
      password: 'telemetry-secret'
    }
  };
}

function validValidation(): SetupSectionValidationMap {
  const result = {
    state: 'complete' as const,
    valid: true,
    observedAt: '2026-08-08T06:00:00Z',
    errorCode: null,
    warnings: []
  };
  return { metadata_database: result, telemetry_store: result };
}
