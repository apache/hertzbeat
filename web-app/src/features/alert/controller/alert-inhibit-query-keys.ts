/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertInhibitQuery } from '../alert-inhibit-model';

const rootKey = ['alert-inhibit-policies'] as const;

export const alertInhibitQueryKeys = {
  list: (query: AlertInhibitQuery) => [...rootKey, 'list', query.search, query.pageIndex, query.pageSize] as const
};
