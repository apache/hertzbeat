/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { DashboardContractError } from '../model/dashboard-model';
import { parseAlertSummary, parseDashboardSummary } from './dashboard-schema';

describe('dashboard wire schemas', () => {
  it('allowlists authoritative monitor and alert summaries', () => {
    expect(
      parseDashboardSummary({
        apps: [
          {
            app: ' mysql ',
            category: ' db ',
            size: 3,
            availableSize: 2,
            unAvailableSize: 1,
            unManageSize: 0,
            leak: true
          }
        ],
        leak: true
      })
    ).toEqual({
      apps: [
        {
          app: 'mysql',
          category: 'db',
          size: 3,
          availableSize: 2,
          unAvailableSize: 1,
          unManageSize: 0
        }
      ]
    });
    expect(
      parseAlertSummary({
        total: 0,
        dealNum: 0,
        rate: 100,
        priorityWarningNum: 0,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0,
        leak: true
      })
    ).toMatchObject({ total: 0 });
  });

  it('keeps empty applications authoritative and null applications missing', () => {
    expect(parseDashboardSummary({ apps: [] }).apps).toEqual([]);
    expect(parseDashboardSummary({ apps: null }).apps).toBeNull();
  });

  it.each([
    null,
    {},
    { apps: {} },
    { apps: [{ app: ' ', category: 'c', size: 0, availableSize: 0, unAvailableSize: 0, unManageSize: 0 }] },
    { apps: [{ app: 'x', category: 'c', size: -1, availableSize: 0, unAvailableSize: 0, unManageSize: 0 }] }
  ])('rejects malformed monitor summary %s', value => {
    expect(() => parseDashboardSummary(value)).toThrow(DashboardContractError);
  });

  it.each([
    null,
    {},
    { total: '0', dealNum: 0, rate: 0, priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 },
    { total: -1, dealNum: 0, rate: 0, priorityWarningNum: 0, priorityCriticalNum: 0, priorityEmergencyNum: 0 }
  ])('rejects malformed alert summary %s', value => {
    expect(() => parseAlertSummary(value)).toThrow(DashboardContractError);
  });
});
