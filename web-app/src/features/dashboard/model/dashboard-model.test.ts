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
  monitorTotals
} from './dashboard-model';

describe('dashboard contracts', () => {
  it('derives totals only from canonical application evidence', () => {
    expect(
      monitorTotals([{ app: 'mysql', category: 'db', size: 5, availableSize: 3, unAvailableSize: 1, unManageSize: 1 }])
    ).toEqual({ total: 5, available: 3, unavailable: 1, unmanaged: 1 });
  });

  it('classifies only stable request evidence as unavailable', () => {
    expect(dashboardFailureKind(new DashboardRequestFailure('unavailable'))).toBe('unavailable');
    expect(dashboardFailureKind(new DashboardRequestFailure('error'))).toBe('error');
    expect(dashboardFailureKind(new DashboardContractError('invalid contract'))).toBe('error');
    expect(dashboardFailureKind(new Error('unknown failure'))).toBe('error');
  });
});
