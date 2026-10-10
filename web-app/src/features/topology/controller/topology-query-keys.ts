/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { scopedQueryKey } from '@/shared/query-context';

import { parseTopologyQuery, writeTopologyQuery, type TopologyQuery } from '../model/topology-model';

const topologyRootKey = ['topology'] as const;

export const topologyQueryKeys = {
  graph: (query: TopologyQuery, refreshRevision = 0) => {
    const canonical = parseTopologyQuery(writeTopologyQuery(query));
    return [
      ...scopedQueryKey(topologyRootKey, { environment: canonical.environment }, canonical.window, refreshRevision),
      {
        focusEntityId: canonical.focusEntityId,
        depth: canonical.depth,
        sourceKind: canonical.sourceKind,
        relationType: canonical.relationType,
        hideInternal: canonical.hideInternal,
        pageIndex: canonical.pageIndex,
        pageSize: canonical.pageSize
      }
    ] as const;
  }
};
