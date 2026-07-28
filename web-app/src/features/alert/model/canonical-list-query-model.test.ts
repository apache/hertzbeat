/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { zeroBasedPageChange } from '@/shared/query-context';

import { readNoticeReceiverQuery, writeNoticeReceiverQuery } from '../notice-receiver/model/notice-receiver-model';
import { readNoticeRuleQuery, writeNoticeRuleQuery } from '../notice-rule/model/notice-rule-model';
import { readNoticeTemplateQuery, writeNoticeTemplateQuery } from '../notice-template-model';
import { readAlertGroupQuery, writeAlertGroupQuery } from './alert-group-model';
import { readAlertInhibitQuery, writeAlertInhibitQuery } from './alert-inhibit-model';
import { readAlertQuery, writeAlertQuery } from './alert-model';
import { readAlertRuleQuery, writeAlertRuleQuery } from './alert-rule-model';
import { readAlertSilenceQuery, writeAlertSilenceQuery } from './alert-silence-model';

type CanonicalResult = { query: { pageIndex: number; pageSize: number }; canonical: string };

const queryModels: ReadonlyArray<[string, (params: URLSearchParams) => CanonicalResult]> = [
  ['alerts', params => canonical(params, readAlertQuery, writeAlertQuery)],
  ['alert rules', params => canonical(params, readAlertRuleQuery, writeAlertRuleQuery)],
  ['alert groups', params => canonical(params, readAlertGroupQuery, writeAlertGroupQuery)],
  ['alert inhibits', params => canonical(params, readAlertInhibitQuery, writeAlertInhibitQuery)],
  ['alert silences', params => canonical(params, readAlertSilenceQuery, writeAlertSilenceQuery)],
  ['notice receivers', params => canonical(params, readNoticeReceiverQuery, writeNoticeReceiverQuery)],
  ['notice rules', params => canonical(params, readNoticeRuleQuery, writeNoticeRuleQuery)],
  ['notice templates', params => canonical(params, readNoticeTemplateQuery, writeNoticeTemplateQuery)]
];

describe('canonical list route query models', () => {
  it.each(queryModels)('%s rejects partial numbers and removes unknown parameters', (_name, resolve) => {
    const { query, canonical } = resolve(new URLSearchParams('pageIndex=2junk&pageSize=20junk&unknown=discard'));

    expect(query).toMatchObject({ pageIndex: 0, pageSize: 8 });
    expect(canonical).not.toMatch(/junk|unknown/u);
  });

  it.each(queryModels)('%s preserves an exact zero-based server page', (_name, resolve) => {
    const { query, canonical } = resolve(new URLSearchParams('pageIndex=2&pageSize=15'));

    expect(query).toMatchObject({ pageIndex: 2, pageSize: 15 });
    expect(resolve(new URLSearchParams(canonical)).query).toEqual(query);
  });
});

describe('canonical list pagination changes', () => {
  it('keeps the requested zero-based page when page size is unchanged', () => {
    expect(zeroBasedPageChange(3, 15, 15)).toEqual({ pageIndex: 2, pageSize: 15 });
  });

  it('returns to the first server page when page size changes', () => {
    expect(zeroBasedPageChange(3, 25, 15)).toEqual({ pageIndex: 0, pageSize: 25 });
  });
});

function canonical<T extends { pageIndex: number; pageSize: number }>(
  params: URLSearchParams,
  read: (params: URLSearchParams) => T,
  write: (query: T) => URLSearchParams
): CanonicalResult {
  const query = read(params);
  return { query, canonical: write(query).toString() };
}
