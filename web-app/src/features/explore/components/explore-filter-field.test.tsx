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

import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { ExploreFilterField } from './explore-filter-field';

describe('Explore filter field', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('renders the stable submission error mapping as an accessible field error', () => {
    render(<ExploreFilterField id="explore-step" error="invalid_step" t={i18n.t}>
      <input aria-describedby="explore-step-error" />
    </ExploreFilterField>);

    expect(screen.getByRole('alert')).toHaveAttribute('id', 'explore-step-error');
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('explore.submissionErrors.invalidStep'));
  });
});
