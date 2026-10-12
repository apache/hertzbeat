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

import { useEffect, useRef } from 'react';

import type { AlertActionCapabilities } from '../model/alert-action-capability';

export function useAlertSilenceRoleLossRetirement(
  capabilities: AlertActionCapabilities,
  retireDetail: () => void,
  selectIds: (ids: number[]) => void
) {
  const previousRef = useRef({
    canWrite: capabilities.canWrite,
    canDelete: capabilities.canDelete
  });
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = {
      canWrite: capabilities.canWrite,
      canDelete: capabilities.canDelete
    };
    if (previous.canWrite && !capabilities.canWrite) retireDetail();
    if (previous.canDelete && !capabilities.canDelete) selectIds([]);
  }, [capabilities.canDelete, capabilities.canWrite, retireDetail, selectIds]);
}
