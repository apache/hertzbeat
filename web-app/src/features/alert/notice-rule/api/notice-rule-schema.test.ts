/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { NoticeRuleContractError } from '../model/notice-rule-failure';
import { parseNoticeRulePage } from './notice-rule-schema';

const query = { name: '', pageIndex: 0, pageSize: 8 };
const rule = (id: number) => ({
  id,
  name: `Rule ${id}`,
  receiverId: [11],
  receiverName: ['Email'],
  templateId: null,
  templateName: null,
  enable: true,
  filterAll: true
});

describe('notice rule page schema', () => {
  it.each([
    [
      'request number mismatch',
      {
        content: Array.from({ length: 8 }, (_, index) => rule(index + 9)),
        totalElements: 16,
        totalPages: 2,
        number: 1,
        size: 8
      }
    ],
    [
      'request size mismatch',
      {
        content: Array.from({ length: 15 }, (_, index) => rule(index + 1)),
        totalElements: 15,
        totalPages: 2,
        number: 0,
        size: 15
      }
    ],
    [
      'inconsistent total pages',
      {
        content: Array.from({ length: 8 }, (_, index) => rule(index + 1)),
        totalElements: 10,
        totalPages: 3,
        number: 0,
        size: 8
      }
    ]
  ])('retains the %s check', (_name, page) => {
    expect(() => parseNoticeRulePage(page, query)).toThrow(NoticeRuleContractError);
  });

  it.each([
    [
      'a short non-last page',
      {
        content: Array.from({ length: 7 }, (_, index) => rule(index + 1)),
        totalElements: 10,
        totalPages: 2,
        number: 0,
        size: 8
      },
      query
    ],
    [
      'a short last page',
      { content: [rule(9)], totalElements: 10, totalPages: 2, number: 1, size: 8 },
      { ...query, pageIndex: 1 }
    ],
    [
      'duplicate stable ids on an otherwise exact page',
      {
        content: [...Array.from({ length: 7 }, (_, index) => rule(index + 1)), rule(1)],
        totalElements: 10,
        totalPages: 2,
        number: 0,
        size: 8
      },
      query
    ]
  ])('rejects %s', (_name, page, requested) => {
    expect(() => parseNoticeRulePage(page, requested)).toThrow(NoticeRuleContractError);
  });

  it('accepts an empty page beyond the authoritative result range', () => {
    expect(
      parseNoticeRulePage(
        { content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 },
        { ...query, pageIndex: 2 }
      )
    ).toMatchObject({ content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 });
  });
});
