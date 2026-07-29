/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { EntityMonitorQuery } from './entity-contract';

export const defaultEntityMonitorQuery: EntityMonitorQuery = { pageIndex: 0, pageSize: 50 };
export const entityMonitorStatuses = [0, 1, 2] as const;

type EntityMonitorQueryInput = {
  status?: number | undefined;
  app?: string | undefined;
  pageIndex?: number | undefined;
  pageSize?: number | undefined;
};

export function normalizeEntityMonitorQuery(input: EntityMonitorQueryInput): EntityMonitorQuery {
  const app = input.app?.trim();
  const status = Number.isSafeInteger(input.status) && (input.status ?? -1) >= 0 ? input.status : undefined;
  const pageIndex = Number.isSafeInteger(input.pageIndex) && (input.pageIndex ?? -1) >= 0 ? input.pageIndex : 0;
  return {
    ...(status === undefined ? {} : { status }),
    ...(app ? { app } : {}),
    pageIndex: pageIndex ?? 0,
    pageSize: 50
  };
}
