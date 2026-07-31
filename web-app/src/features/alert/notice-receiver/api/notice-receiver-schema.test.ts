/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  NoticeReceiverContractError,
  parseNoticeReceiverMutationWire,
  parseNoticeReceiverOptionsWire,
  parseNoticeReceiverPageWire,
  parseNoticeReceiverWire
} from './notice-receiver-schema';

const receiver = {
  id: 7,
  name: 'Pager',
  type: 2,
  typeKey: 'webhook',
  options: { hookAuthType: 'Bearer' },
  configuredSecrets: ['hookUrl'],
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};
const query = { name: 'Pager', pageIndex: 1, pageSize: 8 };
const page = {
  content: [receiver],
  totalElements: 9,
  totalPages: 2,
  number: 1,
  size: 8
};

describe('notice receiver wire schemas', () => {
  it('drops standard Spring page metadata without relaxing receiver items', () => {
    const springMetadata = {
      empty: true,
      first: true,
      last: true,
      numberOfElements: 0,
      pageable: { pageNumber: 0, pageSize: 8 },
      sort: { empty: true, sorted: false, unsorted: true }
    };
    expect(
      parseNoticeReceiverPageWire(
        { content: [], totalElements: 0, totalPages: 0, number: 0, size: 8, ...springMetadata },
        { ...query, pageIndex: 0 }
      )
    ).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 });
    expect(() =>
      parseNoticeReceiverPageWire({ ...page, content: [{ ...receiver, accessToken: 'echoed-secret' }] }, query)
    ).toThrow(NoticeReceiverContractError);
  });

  it('normalizes absent audit metadata while keeping the response exact', () => {
    const { creator, modifier, gmtCreate, gmtUpdate } = parseNoticeReceiverWire({
      id: 7,
      name: 'Pager',
      type: 2,
      typeKey: 'webhook',
      options: {},
      configuredSecrets: []
    });

    expect({ creator, modifier, gmtCreate, gmtUpdate }).toEqual({
      creator: null,
      modifier: null,
      gmtCreate: null,
      gmtUpdate: null
    });
    expect(() => parseNoticeReceiverWire({ ...receiver, accessToken: 'echoed-secret' })).toThrow(
      NoticeReceiverContractError
    );
  });

  it('rejects invalid structured options and configured secret names at the Zod boundary', () => {
    expect(() => parseNoticeReceiverWire({ ...receiver, options: { hookAuthType: 'Digest' } })).toThrow(
      NoticeReceiverContractError
    );
    expect(() =>
      parseNoticeReceiverWire({ ...receiver, options: { hookAuthType: 'Bearer', hookUrl: 'echoed-secret' } })
    ).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverWire({ ...receiver, configuredSecrets: ['email'] })).toThrow(
      NoticeReceiverContractError
    );
  });

  it('rejects unsupported types and unsafe identifiers', () => {
    expect(() => parseNoticeReceiverWire({ ...receiver, type: 15 })).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverWire({ ...receiver, id: 0 })).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverOptionsWire([{ id: 0, name: 'Pager', type: 2 }])).toThrow(
      NoticeReceiverContractError
    );
    expect(() => parseNoticeReceiverMutationWire({ id: 0, status: 'deleted', receiver: null })).toThrow(
      NoticeReceiverContractError
    );
    expect(() => parseNoticeReceiverWire({ ...receiver, id: Number.MAX_SAFE_INTEGER + 1 })).toThrow(
      NoticeReceiverContractError
    );
  });

  it('validates page, rule option, and mutation envelopes', () => {
    expect(() =>
      parseNoticeReceiverPageWire(
        {
          content: [receiver],
          totalElements: 1,
          totalPages: 1,
          number: -1,
          size: 8
        },
        query
      )
    ).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverOptionsWire([{ id: 7, name: 'Pager', type: 2, options: {} }])).toThrow(
      NoticeReceiverContractError
    );
    expect(() => parseNoticeReceiverMutationWire({ id: 7, status: 'saved', receiver })).toThrow(
      NoticeReceiverContractError
    );
  });

  it.each([
    ['zero page size', { ...page, size: 0 }],
    ['request page mismatch', { ...page, number: 0 }],
    ['request size mismatch', { ...page, size: 15 }],
    ['inconsistent total pages', { ...page, totalPages: 3 }],
    ['content beyond the last-page remainder', { ...page, content: [receiver, { ...receiver, id: 8 }] }],
    ['duplicate receiver ids', { ...page, content: [receiver, receiver], totalElements: 10 }]
  ])('rejects Spring page evidence with %s', (_name, evidence) => {
    expect(() => parseNoticeReceiverPageWire(evidence, query)).toThrow(NoticeReceiverContractError);
  });

  it.each([
    [
      'a short non-last page',
      { content: [receiver], totalElements: 100, totalPages: 13, number: 0, size: 8 },
      { ...query, pageIndex: 0 }
    ],
    ['a short last page', { content: [receiver], totalElements: 10, totalPages: 2, number: 1, size: 8 }, query]
  ])('rejects %s under an authoritative Spring total', (_name, evidence, requested) => {
    expect(() => parseNoticeReceiverPageWire(evidence, requested)).toThrow(NoticeReceiverContractError);
  });

  it('accepts an empty page beyond the authoritative result range', () => {
    expect(
      parseNoticeReceiverPageWire(
        { content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 },
        { ...query, pageIndex: 2 }
      )
    ).toMatchObject({ content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 });
  });
});
