/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertGroupQuery } from '../alert-group-model';

const rootKey = ['alert-group-policies'] as const;

export const alertGroupQueryKeys = {
  list: (query: AlertGroupQuery) => [
    ...rootKey,
    'list',
    query.search,
    query.pageIndex,
    query.pageSize
  ] as const
};
