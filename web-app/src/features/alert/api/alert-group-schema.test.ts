/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { AlertGroupContractError, AlertGroupMissingError } from '../model/alert-group-model';
import { parseAlertGroupDetail, parseAlertGroupPage } from './alert-group-schema';

const persisted = {
  id: 7,
  name: 'By service',
  groupLabels: ['service', 'severity'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('alert group wire schemas', () => {
  it('allowlists detail fields and preserves nullable Java entity values', () => {
    expect(parseAlertGroupDetail({ ...persisted, internal: 'ignored' })).toEqual(persisted);
    expect(
      parseAlertGroupDetail({
        ...persisted,
        groupLabels: null,
        groupWait: null,
        groupInterval: null,
        repeatInterval: null,
        enable: null,
        gmtCreate: null,
        gmtUpdate: null
      })
    ).toMatchObject({
      groupLabels: null,
      groupWait: null,
      groupInterval: null,
      repeatInterval: null,
      enable: null,
      gmtCreate: null,
      gmtUpdate: null
    });
  });

  it.each([
    ['unsafe id', { ...persisted, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['blank name', { ...persisted, name: '  ' }],
    ['duplicate grouping label', { ...persisted, groupLabels: ['service', 'service'] }],
    ['negative interval', { ...persisted, groupInterval: -1 }],
    ['string enablement', { ...persisted, enable: 'true' }],
    ['numeric audit time', { ...persisted, gmtUpdate: Date.now() }],
    ['invalid local audit time', { ...persisted, gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects malformed %s evidence', (_label, value) => {
    expect(() => parseAlertGroupDetail(value)).toThrow(AlertGroupContractError);
  });

  it('keeps missing detail distinct from malformed detail', () => {
    expect(() => parseAlertGroupDetail(null)).toThrow(AlertGroupMissingError);
    expect(() => parseAlertGroupDetail({})).toThrow(AlertGroupContractError);
  });

  it('validates Spring page consistency, request identity, and unique ids', () => {
    const query = { search: '', pageIndex: 1, pageSize: 15 };
    expect(
      parseAlertGroupPage(
        {
          content: [persisted],
          totalElements: 16,
          totalPages: 2,
          number: 1,
          size: 15,
          ignored: true
        },
        query
      )
    ).toEqual({ content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15 });
    expect(() =>
      parseAlertGroupPage(
        {
          content: [persisted],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 8
        },
        query
      )
    ).toThrow(AlertGroupContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [persisted],
          totalElements: 16,
          totalPages: 1,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertGroupContractError);
    expect(() =>
      parseAlertGroupPage(
        {
          content: [persisted, persisted],
          totalElements: 17,
          totalPages: 2,
          number: 1,
          size: 15
        },
        query
      )
    ).toThrow(AlertGroupContractError);
  });

  it.each([
    [
      'a short non-last page',
      {
        content: Array.from({ length: 7 }, (_, index) => ({ ...persisted, id: index + 1 })),
        totalElements: 10,
        totalPages: 2,
        number: 0,
        size: 8
      },
      { search: '', pageIndex: 0, pageSize: 8 }
    ],
    [
      'a short last page',
      { content: [persisted], totalElements: 10, totalPages: 2, number: 1, size: 8 },
      { search: '', pageIndex: 1, pageSize: 8 }
    ]
  ])('rejects %s under an authoritative Spring total', (_name, page, query) => {
    expect(() => parseAlertGroupPage(page, query)).toThrow(AlertGroupContractError);
  });

  it('accepts an empty page beyond the authoritative result range', () => {
    expect(
      parseAlertGroupPage(
        { content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 },
        { search: '', pageIndex: 2, pageSize: 8 }
      )
    ).toEqual({ content: [], totalElements: 10, totalPages: 2, number: 2, size: 8 });
  });
});
