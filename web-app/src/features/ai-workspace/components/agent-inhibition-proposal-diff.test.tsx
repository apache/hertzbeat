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

import { render, screen, cleanup, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { AgentInhibitionPreviewView } from './agent-inhibition-preview-view';
const config = (enable: boolean) => ({
  name: 'test-policy',
  sourceLabels: { severity: 'critical' },
  targetLabels: { severity: 'warning' },
  equalLabels: ['host'],
  enable
});
describe('server-bound native before and after values', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('shows only changed fields from a verified prior read', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView
          preview={{ targetId: '100', sourceHash: 'a'.repeat(64), before: config(true), configuration: config(false) }}
        />
      </I18nextProvider>
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText('enable')).toBeInTheDocument();
    expect(within(table).getByText('true')).toBeInTheDocument();
    expect(within(table).getByText('false')).toBeInTheDocument();
    expect(within(table).queryByText('name')).toBeNull();
  });
  it('does not invent a before value when a saved receipt is unavailable', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView
          preview={{ targetId: '100', sourceHash: 'a'.repeat(64), configuration: config(false) }}
        />
      </I18nextProvider>
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/Verified prior values are unavailable/)).toBeInTheDocument();
  });
  it('does not report a map insertion-order difference as a semantic change', () => {
    const before = { ...config(false), sourceLabels: { severity: 'critical', app: 'test' } };
    const after = { ...config(false), sourceLabels: { app: 'test', severity: 'critical' } };
    render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView
          preview={{ targetId: '100', sourceHash: 'a'.repeat(64), before, configuration: after }}
        />
      </I18nextProvider>
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/No editable fields change/)).toBeInTheDocument();
  });
  it('labels every removed field for an exact deletion', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView
          preview={{ targetId: '100', sourceHash: 'a'.repeat(64), before: config(false), configuration: null }}
        />
      </I18nextProvider>
    );
    expect(within(screen.getByRole('table')).getAllByText('Removed')).toHaveLength(5);
  });
});
