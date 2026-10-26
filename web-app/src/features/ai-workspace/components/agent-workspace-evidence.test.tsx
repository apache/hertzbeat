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
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { AgentWorkspaceEvidence } from './agent-workspace-evidence';
import type { AgentEvidence } from '../model/agent-evidence';
const item: AgentEvidence = {
  evidenceId: 'ev',
  runUid: 'r',
  toolCallId: 't',
  toolName: 'entity.get',
  signalType: 'entity',
  resourceType: 'entity',
  resourceId: '42',
  start: null,
  end: null,
  observationCount: 1,
  status: 'OBSERVED',
  summary: '<img src=x onerror=alert(1)>',
  partial: null
};
function view(evidence?: AgentEvidence[]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AgentWorkspaceEvidence evidence={evidence} running={false} />
    </I18nextProvider>
  );
}
describe('evidence presentation', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  it('distinguishes older unrecorded evidence from a verified empty list', () => {
    const rendered = view();
    expect(screen.getByText(/not recorded for this run/)).toBeInTheDocument();
    rendered.unmount();
    view([]);
    expect(screen.getByText(/does not mean the system is healthy/)).toBeInTheDocument();
  });
  it('shows unknown coverage honestly and treats summary as plain text', () => {
    const rendered = view([item]);
    expect(screen.getByText('Coverage not reported')).toBeInTheDocument();
    expect(rendered.container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link', { name: 'View source' })).toHaveAttribute('href', '/entities/42');
  });
  it('marks partial results', () => {
    view([{ ...item, partial: true }]);
    expect(screen.getByText('Partial evidence')).toBeInTheDocument();
  });
});
