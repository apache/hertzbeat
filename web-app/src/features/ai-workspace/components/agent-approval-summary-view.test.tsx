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
import { approvalSummaryFixture } from '../model/agent-approval-summary-fixture';
import { AgentApprovalSummaryView } from './agent-approval-summary-view';
describe('readable bounded approval facts', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('shows every origin, requested intervals/timeouts, fingerprints and original input hash', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentApprovalSummaryView summary={approvalSummaryFixture()} />
      </I18nextProvider>
    );
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('https://example.org')).toBeInTheDocument();
    expect(screen.getAllByText('Interval: 600 seconds')).toHaveLength(2);
    expect(screen.getByText('Timeout: 1000 ms')).toBeInTheDocument();
    expect(screen.getByText('Timeout: 2000 ms')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    expect(screen.getByText('b'.repeat(16))).toBeInTheDocument();
    expect(
      screen.getByText('Sensitive values and free text are omitted; paths and keys are represented by fingerprints.')
    ).toBeInTheDocument();
  });
  it('does not label unsupported facts as complete', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentApprovalSummaryView summary={{ ...approvalSummaryFixture(), complete: false }} />
      </I18nextProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('does not cover every requested field');
  });
});
