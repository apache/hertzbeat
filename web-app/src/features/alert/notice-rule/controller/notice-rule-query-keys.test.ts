/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { noticeRuleQueryKeys } from './notice-rule-query-keys';

describe('notice rule query keys', () => {
  it('names dependency queries without changing their established cache identity', () => {
    expect(noticeRuleQueryKeys.receiverOptions()).toEqual(['notice-receivers', 'all']);
    expect(noticeRuleQueryKeys.templateOptions()).toEqual(['notice-templates', 'all']);
  });
});
