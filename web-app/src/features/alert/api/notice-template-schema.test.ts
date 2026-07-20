/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { NoticeTemplateContractError } from '../notice-template-model';
import { parseNoticeTemplateDetailWire, parseNoticeTemplatePageWire } from './notice-template-schema';

const query = { name: '', preset: true, pageIndex: 0, pageSize: 8 };
const custom = { id: 42, name: 'Custom', type: 1, preset: false, content: '${content}' };
const preset = { name: 'Built-in', type: 1, preset: true, content: '${content}' };

describe('Notice Template wire schema', () => {
  it('parses exact custom detail evidence and rejects unsupported primitive values', () => {
    expect(parseNoticeTemplateDetailWire(custom)).toEqual(custom);

    for (const evidence of [
      { ...custom, id: 0 },
      { ...custom, id: Number.MAX_SAFE_INTEGER + 1 },
      { ...custom, type: 15 },
      { ...custom, content: '' },
      { ...custom, gmtUpdate: Number.POSITIVE_INFINITY }
    ]) {
      expect(() => parseNoticeTemplateDetailWire(evidence)).toThrow(NoticeTemplateContractError);
    }
  });

  it('preserves the real optional preset id contract without fabricating an identity', () => {
    const parsed = parseNoticeTemplateDetailWire(preset);
    expect(parsed).toEqual(preset);
    expect(Object.hasOwn(parsed, 'id')).toBe(false);
    expect(parseNoticeTemplateDetailWire({ ...preset, id: null })).toEqual({ ...preset, id: null });
    expect(parseNoticeTemplateDetailWire({ ...preset, id: 7 })).toEqual({ ...preset, id: 7 });

    for (const id of [undefined, null, 0, -1]) {
      expect(() => parseNoticeTemplateDetailWire({ ...custom, id })).toThrow(NoticeTemplateContractError);
    }
  });

  it('uses custom ids and preset type/name pairs as branch-specific provable identities', () => {
    const customQuery = { ...query, preset: false };
    expect(
      parseNoticeTemplatePageWire(
        {
          content: [custom, { ...custom, id: 43 }],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 8
        },
        customQuery
      ).content
    ).toHaveLength(2);
    expect(
      parseNoticeTemplatePageWire(
        {
          content: [preset, { ...preset, type: 2 }],
          totalElements: 2,
          totalPages: 1,
          number: 0,
          size: 8
        },
        query
      ).content
    ).toHaveLength(2);

    for (const [content, request] of [
      [[custom, { ...custom, name: 'Other' }], customQuery],
      [[preset, { ...preset, content: '${other}' }], query]
    ] as const) {
      expect(() =>
        parseNoticeTemplatePageWire({ content, totalElements: 2, totalPages: 1, number: 0, size: 8 }, request)
      ).toThrow(NoticeTemplateContractError);
    }
  });

  it('rejects content beyond the requested page size even when the reported total is larger', () => {
    const customQuery = { ...query, preset: false };
    const content = Array.from({ length: 9 }, (_, index) => ({
      ...custom,
      id: index + 1,
      name: `Custom ${index + 1}`
    }));

    expect(() =>
      parseNoticeTemplatePageWire({ content, totalElements: 9, totalPages: 2, number: 0, size: 8 }, customQuery)
    ).toThrow(NoticeTemplateContractError);
  });

  it('accepts an exact empty snapshot for an out-of-range requested page', () => {
    expect(
      parseNoticeTemplatePageWire(
        { content: [], totalElements: 8, totalPages: 1, number: 2, size: 8 },
        { ...query, pageIndex: 2 }
      )
    ).toEqual({ content: [], totalElements: 8, totalPages: 1, number: 2, size: 8 });
  });

  it('throws a redacted strict-contract error without retaining rejected input or Zod evidence', () => {
    const privateBody = '${private-template-body}';
    const privateTelemetry = 'trace-private-token';
    let error: unknown;
    try {
      parseNoticeTemplateDetailWire({ ...custom, content: privateBody, telemetry: privateTelemetry });
    } catch (reason: unknown) {
      error = reason;
    }

    expect(error).toBeInstanceOf(NoticeTemplateContractError);
    expect(error).toMatchObject({ message: 'Notice Template response is invalid' });
    expect(error).not.toHaveProperty('cause');
    expect(JSON.stringify(error)).not.toContain(privateBody);
    expect(JSON.stringify(error)).not.toContain(privateTelemetry);
  });
});
