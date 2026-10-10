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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MonitorEditorWorkspace } from './monitor-editor-workspace';

const appHelpUrl = 'https://hertzbeat.apache.org/docs/help/mysql';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../controller/use-monitor-editor-controller', () => ({
  useMonitorEditorController: () => ({
    state: { evidence: { kind: 'loading' }, draft: undefined, apps: [], helpUrl: appHelpUrl },
    actions: {}
  })
}));

afterEach(cleanup);

describe('MonitorEditorWorkspace', () => {
  it('keeps monitor help available while creating or editing', () => {
    render(<MonitorEditorWorkspace mode="new" />);

    expect(screen.getByRole('link', { name: 'monitor.help' })).toHaveAttribute('href', appHelpUrl);
  });
});
