/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { initializeI18n } from '@/core/i18n/i18n';

import { SetupAdministratorForm } from './setup-administrator-form';

describe('SetupAdministratorForm', () => {
  beforeAll(() => initializeI18n());
  afterEach(cleanup);

  it('renders one username/password/confirmation column and cannot submit a mismatch', async () => {
    const blockedSubmit = vi.fn();
    const blocked = renderForm({ canSubmit: false, confirmationMismatch: true, submit: blockedSubmit });

    expect(within(blocked.container).getByLabelText('Username')).toBeRequired();
    expect(within(blocked.container).getByLabelText('Password')).toBeRequired();
    expect(within(blocked.container).getByLabelText('Confirm password')).toBeRequired();
    expect(within(blocked.container).getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(within(blocked.container).getByRole('button', { name: 'Create administrator' })).toBeDisabled();
    fireEvent.submit(blocked.container.querySelector('form')!);

    const allowedSubmit = vi.fn();
    const allowed = renderForm({ submit: allowedSubmit });
    fireEvent.submit(allowed.container.querySelector('form')!);
    await waitFor(() => expect(allowedSubmit).toHaveBeenCalledOnce());
    expect(blockedSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['administrator_already_configured', /administrator is already configured/i],
    ['administrator_username_invalid', /username is not valid/i],
    ['setup_locked', /setup access is locked/i],
    ['invalid_request', /setup request is invalid/i],
    ['internal_error', /setup service encountered an internal error/i]
  ] as const)('renders safe failure copy for %s', (errorCode, message) => {
    renderForm({ failure: { failure: 'error', errorCode } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('treats an unclassified create failure as uncertain and tells the operator to refresh first', () => {
    renderForm({ failure: { failure: 'unavailable', errorCode: null } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      /could not confirm whether the administrator was created.*refresh setup status before trying again/i
    );
  });
});

function renderForm(overrides: Record<string, unknown> = {}) {
  return render(
    <AppProviders>
      <SetupAdministratorForm
        username="operator"
        password="secret"
        confirmPassword="secret"
        setUsername={vi.fn()}
        setPassword={vi.fn()}
        setConfirmPassword={vi.fn()}
        canSubmit
        confirmationMismatch={false}
        submitting={false}
        failure={null}
        submit={vi.fn()}
        {...overrides}
      />
    </AppProviders>
  );
}
