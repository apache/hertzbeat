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

import { describe, expect, it, vi } from 'vitest';

import { noticeReceiverDataProvider } from '@/features/alert/notice-receiver/refine';
import { noticeRuleDataProvider } from '@/features/alert/notice-rule/refine';
import { noticeTemplateDataProvider } from '@/features/alert/notice-template';

const endpoint = vi.hoisted(() => ({ value: '/runtime-notice-contract' }));

vi.mock('@/features/alert/api/notice-api-endpoints', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/alert/api/notice-api-endpoints')>()),
  noticeApiEndpoint: endpoint.value
}));

describe('Notice endpoint ownership', () => {
  it('makes every Refine provider consume the shared runtime root contract', () => {
    expect([
      noticeTemplateDataProvider.getApiUrl(),
      noticeReceiverDataProvider.getApiUrl(),
      noticeRuleDataProvider.getApiUrl()
    ]).toEqual([endpoint.value, endpoint.value, endpoint.value]);
  });
});
