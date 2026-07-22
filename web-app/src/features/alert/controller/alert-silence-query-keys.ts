/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertSilenceQuery } from '../alert-silence-model';

const rootKey = ['alert-silence-policies'] as const;

export const alertSilenceQueryKeys = {
  list: (query: AlertSilenceQuery) => [...rootKey, 'list', query.search, query.pageIndex, query.pageSize] as const
};
