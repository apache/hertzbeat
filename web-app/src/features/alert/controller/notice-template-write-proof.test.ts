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

import type { DataProvider } from '@refinedev/core';
import { describe, expect, it, vi } from 'vitest';

import { NoticeTemplateRequestFailure } from '../model/notice-template-failure';
import { proveNoticeTemplateDeletion } from './notice-template-write-proof';

describe('Notice Template write proof boundary', () => {
  it('accepts only typed exact-detail missing evidence', async () => {
    const typedProvider = {
      getOne: vi.fn().mockRejectedValue(new NoticeTemplateRequestFailure('missing', 'rejected'))
    } as Pick<DataProvider, 'getOne'> as DataProvider;
    await expect(proveNoticeTemplateDeletion(typedProvider, 42)).resolves.toBeUndefined();

    const arbitrary = { statusCode: 404 };
    const arbitraryProvider = { getOne: vi.fn().mockRejectedValue(arbitrary) } as Pick<
      DataProvider,
      'getOne'
    > as DataProvider;
    await expect(proveNoticeTemplateDeletion(arbitraryProvider, 42)).rejects.toBe(arbitrary);
  });
});
