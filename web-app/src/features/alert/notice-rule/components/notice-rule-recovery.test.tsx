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

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeRuleRecovery } from './notice-rule-recovery';

describe('Notice Rule recovery', () => {
  it('does not offer a fake retry after create identity becomes commit-uncertain', () => {
    render(
      <NoticeRuleRecovery
        recovery={{
          kind: 'create',
          phase: 'commit-uncertain',
          failure: 'commit-uncertain',
          retryable: false
        }}
        canRetry={false}
        retryBusy={false}
        retry={vi.fn()}
      />
    );

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });
});
