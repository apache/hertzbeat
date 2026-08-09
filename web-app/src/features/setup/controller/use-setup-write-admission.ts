/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
