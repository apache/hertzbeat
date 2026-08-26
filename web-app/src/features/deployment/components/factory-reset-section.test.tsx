/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const factoryResetDeployment = vi.fn();

import { DeploymentDangerZone } from './factory-reset-section';

describe('FactoryResetSection', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => factoryResetDeployment.mockReset());
  afterEach(cleanup);

  it('groups migration and reset in the danger zone while requiring the exact reset phrase', async () => {
    factoryResetDeployment.mockResolvedValue({ accepted: true });
    const openMigration = vi.fn();
    const accepted = vi.fn();
    renderSection(openMigration, accepted);

    fireEvent.click(screen.getByRole('button', { name: 'Open migration wizard' }));
    expect(openMigration).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Reset HertzBeat' }));
    const confirm = screen.getByRole('button', { name: 'Erase everything and restart setup' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Confirmation phrase'), { target: { value: 'reset hertzbeat' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Confirmation phrase'), { target: { value: 'RESET HERTZBEAT' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(factoryResetDeployment).toHaveBeenCalledWith('RESET HERTZBEAT'));
    expect(accepted).toHaveBeenCalledOnce();
  });

  it('keeps an accepted reset distinct from a delayed transition into setup', async () => {
    factoryResetDeployment.mockResolvedValue({ accepted: true });
    const accepted = vi.fn().mockRejectedValue(new Error('setup transition is still pending'));
    renderSection(vi.fn(), accepted);

    fireEvent.click(screen.getByRole('button', { name: 'Reset HertzBeat' }));
    fireEvent.change(screen.getByLabelText('Confirmation phrase'), { target: { value: 'RESET HERTZBEAT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Erase everything and restart setup' }));

    expect(
      await screen.findByText(
        'The reset request was saved, but setup is not ready yet. Refresh this page shortly; the server will resume the reset automatically.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('The reset could not be started. No data was cleared; try again.')
    ).not.toBeInTheDocument();
  });
});

function renderSection(onOpenMigration: () => void, onAccepted: () => void | Promise<void>) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DeploymentDangerZone
        onOpenMigration={onOpenMigration}
        onReset={factoryResetDeployment}
        onAccepted={onAccepted}
      />
    </I18nextProvider>
  );
}
