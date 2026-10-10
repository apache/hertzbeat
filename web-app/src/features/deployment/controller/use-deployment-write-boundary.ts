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

export function useDeploymentWriteBoundary(operationId: string | null) {
  const active = useRef(new Set<AbortController>());
  const epoch = useRef(0);
  const retire = useCallback(() => {
    epoch.current += 1;
    active.current.forEach(controller => controller.abort());
    active.current.clear();
  }, []);
  useLayoutEffect(() => {
    retire();
    return retire;
  }, [operationId, retire]);
  const startWrite = useCallback(() => {
    const controller = new AbortController();
    const writeEpoch = ++epoch.current;
    active.current.add(controller);
    return {
      epoch: writeEpoch,
      signal: controller.signal,
      release: () => epoch.current === writeEpoch && active.current.delete(controller)
    };
  }, []);
  const currentEpoch = useCallback(() => epoch.current, []);
  return { startWrite, currentEpoch };
}
