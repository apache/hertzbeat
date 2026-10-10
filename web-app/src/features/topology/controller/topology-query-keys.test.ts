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

import { describe, expect, it } from 'vitest';

import type { TopologyQuery } from '../model/topology-model';
import { topologyQueryKeys } from './topology-query-keys';

const fullQuery: TopologyQuery = {
  focusEntityId: 10,
  depth: 2,
  environment: 'prod',
  sourceKind: 'entity-relation',
  window: { from: 1000, to: 2000 },
  relationType: 'depends_on',
  hideInternal: true,
  pageIndex: 1,
  pageSize: 25
};

describe('topology query keys', () => {
  it('uses scoped query identity and covers every backend input', () => {
    const base = topologyQueryKeys.graph(fullQuery, 3);
    expect(base).toEqual([
      'topology',
      { context: '["","","","","","","prod","",""]', window: '1000:2000', refreshRevision: 3 },
      {
        focusEntityId: 10,
        depth: 2,
        sourceKind: 'entity-relation',
        relationType: 'depends_on',
        hideInternal: true,
        pageIndex: 1,
        pageSize: 25
      }
    ]);
    const variants: TopologyQuery[] = [
      { ...fullQuery, focusEntityId: 11 },
      { ...fullQuery, depth: 1 },
      { ...fullQuery, environment: 'stage' },
      { ...fullQuery, sourceKind: 'monitor-bind' },
      { ...fullQuery, window: { from: 2000, to: 3000 } },
      { ...fullQuery, relationType: 'monitors' },
      { ...fullQuery, hideInternal: false },
      { ...fullQuery, pageIndex: 2 },
      { ...fullQuery, pageSize: 50 }
    ];
    for (const variant of variants) expect(topologyQueryKeys.graph(variant, 3)).not.toEqual(base);
  });
});
