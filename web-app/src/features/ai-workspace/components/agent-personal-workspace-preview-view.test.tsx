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

import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { AgentPersonalWorkspacePreviewView } from './agent-personal-workspace-preview-view';
describe('personal workspace approval display', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('shows exact monitor identity and favorite direction', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentPersonalWorkspacePreviewView
          preview={{
            kind: 'FAVORITE',
            monitorId: '9007199254740993',
            metricsName: 'cpu',
            favorite: false,
            application: null,
            expectedRevision: null,
            request: null
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText('#9007199254740993')).toBeInTheDocument();
    expect(screen.getByText('cpu')).toBeInTheDocument();
    expect(screen.getByText(/Remove/)).toBeInTheDocument();
  });
  it('shows the complete versioned layout as escaped text', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentPersonalWorkspacePreviewView
          preview={{
            kind: 'LAYOUT',
            monitorId: null,
            metricsName: null,
            favorite: null,
            application: 'website',
            expectedRevision: 'missing',
            request: {
              expectedRevision: 'missing',
              schemaVersion: 1,
              mode: 'custom',
              columns: 12,
              items: [],
              historyDock: { collapsed: false, height: 12 }
            }
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText('website')).toBeInTheDocument();
    expect(screen.getByText('missing')).toBeInTheDocument();
    expect(screen.getByText(/"historyDock"/)).toBeInTheDocument();
    expect(screen.getByText(/"columns": 12/)).toBeInTheDocument();
  });
});
