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
import { AgentInhibitionPreviewView } from './agent-inhibition-preview-view';
describe('readable exact inhibition policy approval', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('shows full non-secret configuration escaped and the concurrency limitation', () => {
    const name = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView
          preview={{
            targetId: '9007199254740993',
            sourceHash: 'a'.repeat(64),
            configuration: {
              name,
              sourceLabels: { severity: 'critical' },
              targetLabels: { severity: 'warning' },
              equalLabels: ['host'],
              enable: false
            }
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText('9007199254740993')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    expect(screen.getByText(/"sourceLabels"/)).toBeInTheDocument();
    expect(screen.getByText(/"enable": false/)).toBeInTheDocument();
    expect(screen.getByText(/does not provide atomic version CAS/)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
  it('makes exact destructive target and notification effect explicit', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentInhibitionPreviewView preview={{ targetId: '100', sourceHash: 'b'.repeat(64), configuration: null }} />
      </I18nextProvider>
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/Permanently delete this exact policy/)).toBeInTheDocument();
    expect(screen.getByText(/may resume notifications/)).toBeInTheDocument();
  });
});
