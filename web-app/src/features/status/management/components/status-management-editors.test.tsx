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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { StatusManagementEditors } from './status-management-editors';

const components: StatusComponent[] = [
  { id: 3, orgId: 1, name: 'API', method: 1, configState: 0, state: 0 },
  { orgId: 1, name: 'Unsaved component', method: 1, configState: 0, state: 0 }
];

describe('Status incident editor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders history newest-first without mutating the incident contents', () => {
    const contents = [
      { message: 'Oldest update', state: 0, timestamp: 1_000 },
      { message: 'Newest update', state: 3, timestamp: 3_000 },
      { message: 'Middle update', state: 1, timestamp: 2_000 }
    ];
    const originalOrder = contents.map(item => item.message);
    renderIncident({ ...existingIncident, contents });

    const history = screen.getByText('statusManagement.updateHistory').closest('.ant-list');
    if (!(history instanceof HTMLElement)) throw new Error('Missing incident history');
    expect(
      within(history)
        .getAllByRole('listitem')
        .map(item => item.textContent)
    ).toEqual([
      expect.stringContaining('Newest update'),
      expect.stringContaining('Middle update'),
      expect.stringContaining('Oldest update')
    ]);
    expect(contents.map(item => item.message)).toEqual(originalOrder);
  });

  it('hides history for a new incident and keeps title, loading, and cancel boundaries explicit', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const loading = renderIncident(
      { ...newIncident, contents: [{ message: 'Draft update', state: 0, timestamp: 1_000 }] },
      { saving: true, onCancel, onSubmit }
    );

    expect(screen.getByText('statusManagement.newIncident')).toBeInTheDocument();
    expect(screen.queryByText('statusManagement.updateHistory')).not.toBeInTheDocument();
    const save = screen.getByRole('button', { name: /OK$/ });
    expect(save).toHaveClass('ant-btn-loading');
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();

    loading.unmount();
    renderIncident(newIncident, { onCancel, onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form values through the existing payload mapping and timestamp owner', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(4_000);
    const onSubmit = vi.fn();
    renderIncident(existingIncident, { onSubmit });

    expect(screen.getByText('statusManagement.updateIncident')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('statusManagement.incidentName'), { target: { value: ' Updated ' } });
    fireEvent.change(screen.getByLabelText('statusManagement.updateMessage'), { target: { value: ' Fixed ' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        name: 'Updated',
        components: [components[0]],
        contents: [{ incidentId: 7, message: 'Fixed', state: 0, timestamp: 4_000 }]
      })
    );
  });
});

const existingIncident: StatusIncident = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  components,
  contents: []
};

const newIncident: StatusIncident = {
  orgId: 1,
  name: 'Outage',
  state: 0,
  components,
  contents: []
};

function renderIncident(
  incident: StatusIncident,
  patch: { saving?: boolean; onCancel?: () => void; onSubmit?: (value: StatusIncident) => void } = {}
) {
  return render(
    <StatusManagementEditors
      component={undefined}
      incident={incident}
      orgId={1}
      components={components}
      componentSaving={false}
      incidentSaving={patch.saving ?? false}
      onCloseComponent={vi.fn()}
      onCloseIncident={patch.onCancel ?? vi.fn()}
      onSaveComponent={vi.fn()}
      onSaveIncident={patch.onSubmit ?? vi.fn()}
    />
  );
}
