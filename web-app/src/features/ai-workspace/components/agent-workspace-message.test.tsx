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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { AgentWorkspaceMessage } from './agent-workspace-message';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('renders ordered public text and tool references without duplicating the flattened answer', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceMessage
        message={{
          id: 'fixture',
          text: 'legacy flattened',
          parts: [
            { type: 'text', text: 'before' },
            { type: 'toolCall', id: 'call-1', name: 'read.fixture' },
            { type: 'text', text: 'after' }
          ]
        }}
      />
    </I18nextProvider>
  );
  const article = screen.getByRole('article');
  expect(article.textContent).toMatch(/before.*read.fixture.*after/s);
  expect(article).not.toHaveTextContent('legacy flattened');
});
