/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { StatusOrgForm } from './status-org-form';

const org: StatusOrgRecord = {
  id: 1,
  name: 'HertzBeat',
  home: 'https://hertzbeat.apache.org',
  description: 'Status',
  logo: '/logo.svg',
  feedback: 'ops@example.test',
  color: '#5b6fd8',
  state: 0
};

describe('StatusOrgForm presentation', () => {
  afterEach(cleanup);

  it('starts a missing organization in edit mode with all fields and no cancel action', () => {
    renderOrgForm({ org: undefined });

    for (const key of fieldKeys) expect(screen.getByLabelText(key)).toBeEnabled();
    expect(screen.getByLabelText('statusManagement.color')).toHaveAttribute('type', 'color');
    expect(screen.getByText('common.save').closest('button')).toHaveAttribute('type', 'submit');
    expect(screen.queryByText('common.cancel')).not.toBeInTheDocument();
    expect(screen.queryByText('common.edit')).not.toBeInTheDocument();
  });

  it('keeps a new organization disabled while saving and exposes the loading boundary', () => {
    renderOrgForm({ org: undefined, saving: true });

    for (const key of fieldKeys) expect(screen.getByLabelText(key)).toBeDisabled();
    const save = screen.getByText('common.save').closest('button');
    expect(save).toBeDisabled();
    expect(save).toHaveClass('ant-btn-loading');
    expect(screen.queryByText('common.cancel')).not.toBeInTheDocument();
  });

  it('initializes an existing organization and restores it through cancel', () => {
    const onSubmit = vi.fn();
    renderOrgForm({ org, onSubmit });

    expect(screen.getByLabelText('statusManagement.name')).toHaveValue('HertzBeat');
    expect(screen.getByLabelText('statusManagement.name')).toBeDisabled();
    const edit = screen.getByText('common.edit').closest('button');
    expect(edit).toHaveAttribute('type', 'button');
    fireEvent.click(edit!);

    fireEvent.change(screen.getByLabelText('statusManagement.name'), { target: { value: 'Local draft' } });
    const cancel = screen.getByText('common.cancel').closest('button');
    expect(cancel).toHaveAttribute('type', 'button');
    fireEvent.click(cancel!);

    expect(screen.getByLabelText('statusManagement.name')).toHaveValue('HertzBeat');
    expect(screen.getByLabelText('statusManagement.name')).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses the retained proof action directly and locks an unverifiable create', () => {
    const onRetry = vi.fn().mockResolvedValue(org);
    const proof = renderOrgForm({ org, commandLocked: true, writeRecovery: 'proof', onRetry });

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(onRetry).toHaveBeenCalledOnce();

    proof.unmount();
    renderOrgForm({ org: undefined, commandLocked: true, writeRecovery: 'commit-uncertain' });
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
    expect(screen.getByText('statusManagement.unknown')).toBeInTheDocument();
  });
});

function renderOrgForm(
  patch: {
    org?: StatusOrg | undefined;
    saving?: boolean;
    commandLocked?: boolean;
    writeRecovery?: 'proof' | 'commit-uncertain';
    onRetry?: () => Promise<StatusOrgRecord | undefined>;
    onSubmit?: (value: StatusOrg) => Promise<StatusOrgRecord>;
  } = {}
) {
  return render(
    <StatusOrgForm
      org={patch.org}
      saving={patch.saving ?? false}
      commandLocked={patch.commandLocked ?? false}
      writeRecovery={patch.writeRecovery}
      onRetry={patch.onRetry ?? vi.fn().mockResolvedValue(undefined)}
      onSubmit={patch.onSubmit ?? vi.fn().mockResolvedValue(org)}
    />
  );
}

const fieldKeys = [
  'statusManagement.name',
  'statusManagement.home',
  'status.descriptionLabel',
  'statusManagement.logo',
  'statusManagement.feedback',
  'statusManagement.color'
] as const;
