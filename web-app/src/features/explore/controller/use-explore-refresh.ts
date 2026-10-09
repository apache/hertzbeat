/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQueryClient } from '@tanstack/react-query';
import type { SharedTimeValue } from '@/shared/time';
import type { ExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';

export function useExploreRefresh(
  query: ExploreQuery,
  historical: boolean,
  sharedTime: SharedTimeValue | null,
  refetch: () => Promise<unknown>
) {
  const client = useQueryClient();
  return () => {
    if (!historical) return Promise.resolve();
    if (sharedTime?.manualRefreshOwner === 'time_revision') {
      // Both metric consumers follow this revision; explicit refetching would duplicate the action.
      sharedTime.requestRefresh();
      return Promise.resolve();
    }
    const catalog =
      query.signal === 'metrics'
        ? client.invalidateQueries({ queryKey: exploreQueryKeys.metricInventoryScope(query), refetchType: 'active' })
        : Promise.resolve();
    return Promise.all([refetch(), catalog]).then(() => undefined);
  };
}
