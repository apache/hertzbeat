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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertInhibitRecovery } from './alert-inhibit-recovery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

describe('AlertInhibitRecovery', () => {
  it('offers one actionable proof retry', () => {
    const retry = vi.fn();
    render(
      <AlertInhibitRecovery
        recovery={{ kind: 'save', phase: 'proof', retryable: true }}
        retrying={false}
        retry={retry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('offers proof-only retry for commit-uncertain create recovery', () => {
    const retry = vi.fn();
    render(
      <AlertInhibitRecovery
        recovery={{ kind: 'save', phase: 'commit-uncertain', retryable: true }}
        retrying={false}
        retry={retry}
      />
    );

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
