/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { StatusIncidentQuery } from '../model/status-incident-query';

const rootKey = ['status-management'] as const;

// Query identity contains every URL-owned input that can change incident evidence.
export const statusManagementQueryKeys = {
  org: () => [...rootKey, 'org'] as const,
  components: () => [...rootKey, 'components'] as const,
  incidents: (query: StatusIncidentQuery) => [
    ...rootKey,
    'incidents',
    query.search,
    query.pageIndex,
    query.pageSize
  ] as const
};
