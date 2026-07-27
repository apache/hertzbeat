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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorRowActions } from './monitor-list-actions';

describe('MonitorRowActions copy capability', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('does not render copy when the session capability denies it', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MonitorRowActions
          monitor={{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 }}
          open={vi.fn()}
          run={vi.fn()}
          disabled={false}
          canWrite={false}
        />
      </I18nextProvider>
    );

    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.copy') })).not.toBeInTheDocument();
  });
});
