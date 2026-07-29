/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { AlertContractError } from '../model/alert-model';
import { parseSingleAlertPage } from './alert-schema';

const request = { status: 'firing' as const, pageIndex: 0, pageSize: 10 };
const record = {
  id: 11,
  labels: { alertname: 'HighLatency', severity: 'critical' },
  annotations: { summary: 'Checkout latency exceeded the threshold.' },
  content: 'Checkout latency is above 500 ms.',
  status: 'firing' as const,
  triggerTimes: 3,
  startAt: 1784250000000,
  activeAt: 1784250060000,
  endAt: null,
  fingerprint: 'ignored'
};

describe('SingleAlert page schema', () => {
  it('returns existing alert records, accepts nullable evidence, and preserves a full first page', () => {
    const content = [
      {
        ...record,
        labels: null,
        annotations: null,
        content: null,
        triggerTimes: null,
        startAt: null,
        activeAt: null,
        endAt: null
      },
      ...Array.from({ length: 9 }, (_, index) => ({ ...record, id: index + 12 }))
    ];

    expect(
      parseSingleAlertPage(
        { content, totalElements: 12, totalPages: 2, number: 0, size: 10, pageable: { ignored: true } },
        request
      )
    ).toEqual({
      content: content.map(({ fingerprint: _fingerprint, ...item }) => item),
      totalElements: 12,
      totalPages: 2,
      number: 0,
      size: 10
    });
  });

  it('keeps an authoritative empty page distinct from malformed evidence', () => {
    expect(
      parseSingleAlertPage({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }, request)
    ).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    expect(() => parseSingleAlertPage(null, request)).toThrow(AlertContractError);
  });

  it.each([
    ['another page', { content: [record], totalElements: 11, totalPages: 2, number: 1, size: 10 }],
    [
      'more than the requested page',
      {
        content: Array.from({ length: 11 }, (_, index) => ({ ...record, id: index + 1 })),
        totalElements: 11,
        totalPages: 2,
        number: 0,
        size: 10
      }
    ],
    [
      'a short first page under a cross-page total',
      { content: [record], totalElements: 11, totalPages: 2, number: 0, size: 10 }
    ],
    ['duplicate ids', { content: [record, record], totalElements: 2, totalPages: 1, number: 0, size: 10 }],
    [
      'a non-firing row',
      {
        content: [{ ...record, status: 'resolved' }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }
    ],
    [
      'an unsupported severity',
      {
        content: [{ ...record, labels: { alertname: 'HighLatency', severity: 'debug' } }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }
    ],
    [
      'an unsafe timestamp',
      {
        content: [{ ...record, activeAt: Number.MAX_SAFE_INTEGER + 1 }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }
    ],
    [
      'an unrenderable timestamp',
      {
        content: [{ ...record, activeAt: 8_640_000_000_000_001 }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }
    ]
  ])('rejects %s', (_name, page) => {
    expect(() => parseSingleAlertPage(page, request)).toThrow(AlertContractError);
  });
});
