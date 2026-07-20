/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { DashboardRequestFailure } from '../model/dashboard-model';

const unavailableHttpStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence into a redacted failure safe for feature layers. */
export function normalizeDashboardApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  // Only missing/network/gateway evidence means the dashboard source is
  // unavailable. Other HTTP and envelope failures remain ordinary errors.
  const unavailable =
    error.cause !== undefined || error.status === undefined || unavailableHttpStatuses.has(error.status);
  return new DashboardRequestFailure(unavailable ? 'unavailable' : 'error');
}

export async function dashboardApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeDashboardApiFailure(error);
  }
}
