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
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import en from '@/assets/i18n/en-us.json';
import exploreEn from '@/assets/i18n/explore/en-us.json';
import { LogTransactionStatus } from './explore-log-transaction-status';

afterEach(cleanup);

it('shows a translated retry action when transaction storage is unavailable', () => {
  const retry = vi.fn();
  const t = ((key: string) =>
    key === 'common.retry'
      ? en.common.retry
      : key === 'explore.logAnalysis.unavailable'
        ? exploreEn.explore.logAnalysis.unavailable
        : key) as TFunction;
  render(<LogTransactionStatus state="unavailable" retry={retry} t={t} />);
  expect(screen.getByText(exploreEn.explore.logAnalysis.unavailable)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
  expect(retry).toHaveBeenCalledOnce();
});
