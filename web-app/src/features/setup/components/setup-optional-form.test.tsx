/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { initializeI18n } from '@/core/i18n/i18n';

import { createOptionalDraft } from '../model/setup-optional';
import { SetupOptionalForm } from './setup-optional-form';

describe('SetupOptionalForm', () => {
  beforeAll(() => initializeI18n());
  afterEach(cleanup);

  it('requires explicit acknowledgement of every server warning before completion', () => {
    const complete = vi.fn();
    render(
      <AppProviders>
        <SetupOptionalForm
          draft={createOptionalDraft()}
          updateDraft={vi.fn()}
          save={vi.fn()}
          savePending={false}
          saveFailureKey={null}
          validatePublicAccess={vi.fn()}
          validateMail={vi.fn()}
          validation={{ publicAccess: null, mail: null }}
          pendingWarnings={['public_address_plaintext', 'mail_security_none']}
          acknowledgedWarnings={[]}
          setWarningAcknowledged={vi.fn()}
          complete={complete}
          completePending={false}
          completeFailureKey={null}
        />
      </AppProviders>
    );

    expect(screen.getByText('The public address uses unencrypted HTTP.')).toBeInTheDocument();
    expect(screen.getByText('Mail transport encryption is disabled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test mail connection' })).toBeDisabled();
    const finish = screen.getByRole('button', { name: 'Finish setup' });
    expect(finish).toBeDisabled();
    fireEvent.click(finish);
    expect(complete).not.toHaveBeenCalled();
  });
});
