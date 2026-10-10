/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MonitorParamField } from '../components/monitor-param-field';
import type { MonitorParamDefine } from '../model/monitor-contract';
import { createMonitorEditorDraft } from '../model/monitor-editor-draft';
import { buildMonitorPayload } from '../model/monitor-editor-payload';
import { useMonitorEditorDraft } from './use-monitor-editor-draft';
import { useMonitorEditorUnsavedNavigation } from './use-monitor-editor-unsaved-navigation';

const confirmation = vi.hoisted(() => ({ modal: { confirm: vi.fn(() => ({ destroy: vi.fn() })) } }));
const translation = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ modal: confirmation.modal }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => translation }));

const labels = {
  add: 'Add',
  remove: 'Remove',
  key: 'Key',
  value: 'Value',
  emptyError: 'Empty',
  duplicateError: 'Duplicate'
};
const metricsLabels = { ...labels, unit: 'Unit', type: 'Type', numberType: 'Number', stringType: 'String' };
const define = (type: string, defaultValue: string | null): MonitorParamDefine => ({
  id: null,
  app: 'api',
  field: 'host',
  name: { 'en-US': 'Host' },
  type,
  required: false,
  defaultValue,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mount(type = 'host', defaultValue: string | null = null) {
  const definition = define(type, defaultValue);
  const canonical = createMonitorEditorDraft(undefined, 'api', 'static', [definition]);
  // An edit fixture avoids new-host automatic name creation, which is a real remaining change.
  canonical.monitor = { ...canonical.monitor, id: 7, name: 'Saved monitor' };
  let current: ReturnType<typeof useMonitorEditorDraft> | undefined;
  function Probe() {
    const [params] = useSearchParams();
    const source = params.get('app') ?? 'api';
    const store = useMonitorEditorDraft(source, canonical, [definition], 'static');
    current = store;
    useMonitorEditorUnsavedNavigation(store.dirty, source, store.draft);
    return (
      <MonitorParamField
        define={definition}
        label="Host"
        ariaLabel="Host"
        value={store.draft?.params[0]?.paramValue ?? null}
        onChange={value =>
          store.update(draft => ({ ...draft, params: draft.params.map(param => ({ ...param, paramValue: value })) }))
        }
        mapLabels={labels}
        metricsLabels={metricsLabels}
      />
    );
  }
  const router = createMemoryRouter(
    [
      { path: '/editor', element: <Probe /> },
      { path: '/monitors', element: null }
    ],
    { initialEntries: ['/monitors', '/editor?app=api'], initialIndex: 1 }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    canonical,
    definition,
    current: () => {
      if (!current) throw new Error('Editor not mounted');
      return current;
    }
  };
}

function typeHost(value: string) {
  fireEvent.change(screen.getByLabelText('Host'), { target: { value } });
}

describe('real monitor text field dirty restoration', () => {
  it.each(['text', 'host', 'password', 'textarea', 'array'])(
    '%s null baseline restores through actual input empty string',
    async type => {
      const fixture = mount(type);
      typeHost('typed.example.test');
      expect(fixture.current().dirty).toBe(true);
      typeHost('');
      expect(fixture.current().draft?.params[0]?.paramValue).toBe('');
      expect(fixture.current().dirty).toBe(false);
      // Dirty equivalence must not change the submitted null/empty contract.
      expect(
        buildMonitorPayload(fixture.canonical.monitor, '', fixture.canonical.params, [fixture.definition]).params[0]
          ?.paramValue
      ).toBeNull();
      expect(
        buildMonitorPayload(fixture.current().draft?.monitor ?? {}, '', fixture.current().draft?.params ?? [], [
          fixture.definition
        ]).params[0]?.paramValue
      ).toBe('');
      await act(() => fixture.router.navigate(-1));
      expect(confirmation.modal.confirm).not.toHaveBeenCalled();
      expect(fixture.router.state.location.pathname).toBe('/monitors');
    }
  );

  it('clearing a nonempty default is dirty; restoring that actual default is clean', async () => {
    const fixture = mount('host', 'default.example.test');
    typeHost('');
    expect(fixture.current().dirty).toBe(true);
    typeHost('default.example.test');
    expect(fixture.current().dirty).toBe(false);
    await act(() => fixture.router.navigate(-1));
    expect(confirmation.modal.confirm).not.toHaveBeenCalled();
  });

  it('restoring actual empty inputs across types clears retained dirty ownership', async () => {
    const fixture = mount();
    typeHost('first.example.test');
    typeHost('');
    await act(() => fixture.router.navigate('/editor?app=website'));
    typeHost('second.example.test');
    typeHost('');
    expect(fixture.current().dirty).toBe(false);
    await act(() => fixture.router.navigate('/monitors'));
    expect(confirmation.modal.confirm).not.toHaveBeenCalled();
    expect(fixture.router.state.location.pathname).toBe('/monitors');
  });

  it('restored current type cannot hide a different retained type with meaningful input', async () => {
    const fixture = mount();
    typeHost('retained.example.test');
    await act(() => fixture.router.navigate('/editor?app=website'));
    typeHost('temporary.example.test');
    typeHost('');
    expect(fixture.current().dirty).toBe(true);
    await act(() => fixture.router.navigate('/monitors'));
    expect(confirmation.modal.confirm).toHaveBeenCalledTimes(1);
    expect(fixture.router.state.location.pathname).toBe('/editor');
  });

  it('retained sources use their original schema rather than current text-field equivalence', () => {
    const canonical = createMonitorEditorDraft(undefined, 'api', 'static', []);
    canonical.params = [{ field: 'host', type: 1, paramValue: null }];
    const view = renderHook(
      ({ source, definitions }) => useMonitorEditorDraft(source, canonical, definitions, 'static'),
      {
        initialProps: { source: 'api', definitions: [define('key-value', null)] }
      }
    );
    act(() =>
      view.result.current.update(draft => ({ ...draft, params: [{ field: 'host', type: 1, paramValue: '' }] }))
    );
    view.rerender({ source: 'website', definitions: [define('host', null)] });
    act(() =>
      view.result.current.update(draft => ({ ...draft, params: [{ field: 'host', type: 1, paramValue: '' }] }))
    );
    expect(view.result.current.dirty).toBe(true);
  });

  it('whitespace input remains a real change rather than being silently trimmed', () => {
    const fixture = mount();
    typeHost(' ');
    expect(fixture.current().dirty).toBe(true);
  });
});
