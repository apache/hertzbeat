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

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SetupWriteAuthority } from './setup-write-authority';

export function useSetupWriteAdmission(authoritativeWriteAllowed = false) {
  const [closed, setClosed] = useState(false);
  const closedRef = useRef(false);
  const rejectedRefreshPending = useRef(false);

  const reopen = useCallback(() => {
    rejectedRefreshPending.current = false;
    closedRef.current = false;
    setClosed(false);
  }, []);
  useEffect(() => {
    if (rejectedRefreshPending.current && authoritativeWriteAllowed) reopen();
  }, [authoritativeWriteAllowed, reopen]);

  return {
    closed,
    reconcile: useCallback(
      (authority: SetupWriteAuthority, refreshedWriteAllowed = false) => {
        if (authority === 'current') {
          reopen();
        } else if (authority === 'rejected_refresh_required') {
          rejectedRefreshPending.current = !refreshedWriteAllowed;
          if (refreshedWriteAllowed) reopen();
        }
      },
      [reopen]
    ),
    tryClose: useCallback(() => {
      if (closedRef.current) return false;
      rejectedRefreshPending.current = false;
      closedRef.current = true;
      setClosed(true);
      return true;
    }, []),
    reopen
  };
}
