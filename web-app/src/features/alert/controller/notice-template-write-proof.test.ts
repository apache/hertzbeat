/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
