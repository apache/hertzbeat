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

import { useCallback, useLayoutEffect, useRef } from 'react';

type Refresh = () => Promise<boolean>;

export function useBulletinRefreshController(canRead: boolean, refreshList: Refresh, refreshMetrics: Refresh) {
  const canReadRef = useRef(canRead);
  const inFlight = useRef<Promise<boolean> | null>(null);
  useLayoutEffect(() => {
    canReadRef.current = canRead;
  }, [canRead]);

  const refresh = useCallback(async () => {
    if (!canReadRef.current || inFlight.current) return false;
    const operation = Promise.all([refreshList(), refreshMetrics()]).then(results => results.every(Boolean));
    inFlight.current = operation;
    try {
      return await operation;
    } catch {
      return false;
    } finally {
      if (inFlight.current === operation) inFlight.current = null;
    }
  }, [refreshList, refreshMetrics]);

  return { refresh };
}
