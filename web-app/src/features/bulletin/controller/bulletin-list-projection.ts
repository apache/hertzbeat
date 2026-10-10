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

import type { QueryClient } from '@tanstack/react-query';

import { bulletinQueryKeys } from './bulletin-query-keys';

/** Refreshes the list projection without retrying the mutation that produced it. */
export async function refreshBulletinListProjection(
  client: QueryClient,
  refresh: () => Promise<boolean>,
  isCurrent: () => boolean
) {
  try {
    // The explicit refresh below is the sole proof read; invalidation must not start a duplicate request.
    await client.invalidateQueries({ queryKey: bulletinQueryKeys.lists(), refetchType: 'none' });
    return isCurrent() && (await refresh());
  } catch {
    return false;
  }
}
