/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { PluginContractError, parsePluginPage, parsePluginWriteReceipt } from './plugin-schema';

const plugin = {
  id: 11,
  name: 'audit-plugin',
  enableStatus: true,
  creator: 'admin',
  gmtCreate: '2026-07-23T12:00:00',
  items: [],
  paramCount: 1
};

describe('plugin schema', () => {
  it('maps a coherent Spring page without retaining nested items', () => {
    expect(
      parsePluginPage(
        { content: [plugin], totalElements: 1, totalPages: 1, number: 0, size: 8 },
        { search: '', pageIndex: 0, pageSize: 8 }
      )
    ).toEqual({
      content: [
        {
          id: 11,
          name: 'audit-plugin',
          enableStatus: true,
          creator: 'admin',
          gmtCreate: '2026-07-23T12:00:00',
          paramCount: 1
        }
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    expect(parsePluginWriteReceipt(null)).toBeNull();
  });

  it.each([
    [
      {
        content: [{ ...plugin, jarFilePath: '/secret/plugin.jar' }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      }
    ],
    [{ content: [{ ...plugin, id: 0 }], totalElements: 1, totalPages: 1, number: 0, size: 8 }],
    [{ content: [plugin, plugin], totalElements: 2, totalPages: 1, number: 0, size: 8 }],
    [{ content: [], totalElements: 1, totalPages: 1, number: 0, size: 8 }],
    [{ content: [], totalElements: 0, totalPages: 0, number: 1, size: 8 }]
  ])('rejects unsafe or incoherent plugin page %#', value => {
    expect(() => parsePluginPage(value, { search: '', pageIndex: 0, pageSize: 8 })).toThrow(PluginContractError);
  });

  it('rejects non-null write data', () => {
    expect(() => parsePluginWriteReceipt(true)).toThrow(PluginContractError);
  });
});
