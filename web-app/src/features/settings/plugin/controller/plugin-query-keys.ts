/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { PluginQuery } from '../model/plugin-model';

const root = ['plugins'] as const;
export const pluginQueryKeys = {
  all: root,
  page: (query: PluginQuery) => [...root, 'page', query.search, query.pageIndex, query.pageSize] as const
};
