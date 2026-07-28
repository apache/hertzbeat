/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
import { describe, expect, it } from 'vitest';
import {
  dashboardFailureKind,
  DashboardContractError,
  DashboardRequestFailure,
  isDashboardFailureState,
  monitorTotals
} from './dashboard-model';

describe('dashboard contracts', () => {
  it('derives totals only from canonical application evidence', () => {
    expect(
      monitorTotals([{ app: 'mysql', category: 'db', size: 5, availableSize: 3, unAvailableSize: 1, unManageSize: 1 }])
    ).toEqual({ total: 5, available: 3, unavailable: 1, unmanaged: 1 });
  });

  it('classifies stable request and contract evidence without collapsing failures', () => {
    expect(dashboardFailureKind(new DashboardRequestFailure('permission'))).toBe('permission');
    expect(dashboardFailureKind(new DashboardRequestFailure('unavailable'))).toBe('unavailable');
    expect(dashboardFailureKind(new DashboardRequestFailure('error'))).toBe('error');
    expect(dashboardFailureKind(new DashboardContractError('invalid contract'))).toBe('contract');
    expect(dashboardFailureKind(new Error('unknown failure'))).toBe('error');
  });

  it('keeps both summary renderers on the same failure-state vocabulary', () => {
    expect(isDashboardFailureState({ kind: 'permission' })).toBe(true);
    expect(isDashboardFailureState({ kind: 'contract' })).toBe(true);
    expect(isDashboardFailureState({ kind: 'ready', apps: [] })).toBe(false);
    expect(isDashboardFailureState({ kind: 'empty', summary: alertSummary(0) })).toBe(false);
  });
});

function alertSummary(total: number) {
  return {
    total,
    dealNum: 0,
    rate: 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  };
}
