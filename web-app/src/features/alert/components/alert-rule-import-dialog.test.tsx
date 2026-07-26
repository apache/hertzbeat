/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { AlertRuleImportDialog } from './alert-rule-import-dialog';

describe('AlertRuleImportDialog', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('shows the selected file and keeps submission explicit', () => {
    const submit = vi.fn().mockResolvedValue(true);
    renderDialog({
      draft: { file: new File(['[]'], 'rules.json') },
      onSubmit: submit
    });

    expect(screen.getByText('Selected: rules.json')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import rules' }));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('blocks resubmission after an uncertain outcome and offers canonical inspection', () => {
    const inspect = vi.fn().mockResolvedValue(true);
    renderDialog({
      draft: { file: new File(['[]'], 'rules.json') },
      failure: { kind: 'unavailable', outcome: 'uncertain' },
      inspectionRequired: true,
      onInspect: inspect
    });

    expect(
      screen.getByText('The import result is uncertain. Refresh and inspect the rule list before retrying.')
    ).toBeInTheDocument();
    expect(screen.getByText('Alert rule import is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import rules' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh and inspect' }));
    expect(inspect).toHaveBeenCalledOnce();
  });
});

function renderDialog(
  patch: Partial<React.ComponentProps<typeof AlertRuleImportDialog>['state']> &
    Partial<Pick<React.ComponentProps<typeof AlertRuleImportDialog>, 'onCancel' | 'onFile' | 'onInspect' | 'onSubmit'>>
) {
  const state = {
    draft: null,
    invalid: null,
    failure: null,
    busy: false,
    inspectionRequired: false,
    ...patch
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <App>
        <AlertRuleImportDialog
          state={state}
          onCancel={patch.onCancel ?? vi.fn()}
          onFile={patch.onFile ?? vi.fn()}
          onInspect={patch.onInspect ?? vi.fn().mockResolvedValue(true)}
          onSubmit={patch.onSubmit ?? vi.fn().mockResolvedValue(true)}
        />
      </App>
    </I18nextProvider>
  );
}
