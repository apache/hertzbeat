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

describe('notice receiver wire schemas', () => {
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
    expect(() => parseNoticeReceiverWire({ ...receiver, accessToken: 'echoed-secret' }))
      .toThrow(NoticeReceiverContractError);
  });

  it('rejects unsupported types and unsafe identifiers', () => {
    expect(() => parseNoticeReceiverWire({ ...receiver, type: 15 })).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverWire({ ...receiver, id: Number.MAX_SAFE_INTEGER + 1 }))
      .toThrow(NoticeReceiverContractError);
  });

  it('validates page, rule option, and mutation envelopes', () => {
    expect(() => parseNoticeReceiverPageWire({
      content: [receiver], totalElements: 1, totalPages: 1, number: -1, size: 8
    })).toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverOptionsWire([{ id: 7, name: 'Pager', type: 2, options: {} }]))
      .toThrow(NoticeReceiverContractError);
    expect(() => parseNoticeReceiverMutationWire({ id: 7, status: 'saved', receiver }))
      .toThrow(NoticeReceiverContractError);
  });
});
