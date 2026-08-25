/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useContext, useEffect } from 'react';

import { ShellInvestigationContext, type ShellInvestigationTarget } from './shell-investigation-context';

export function useShellInvestigation() {
  return useContext(ShellInvestigationContext)?.target;
}

export function usePublishShellInvestigation(target: ShellInvestigationTarget | undefined) {
  const publish = useContext(ShellInvestigationContext)?.publish;
  useEffect(() => {
    publish?.(target);
    return () => publish?.(undefined);
  }, [publish, target]);
}
