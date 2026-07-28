/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
