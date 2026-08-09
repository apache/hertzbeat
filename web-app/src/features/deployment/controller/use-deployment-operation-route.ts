/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { readDeploymentRoute, writeDeploymentRoute } from '../model/deployment-route';

export function useDeploymentOperationRoute() {
  const [params, setParams] = useSearchParams();
  const source = params.toString();
  const route = useMemo(() => readDeploymentRoute(new URLSearchParams(source)), [source]);
  const canonical = writeDeploymentRoute(route.operationId).toString();

  useEffect(() => {
    if (route.invalid || source !== canonical) setParams(canonical, { replace: true });
  }, [canonical, route.invalid, setParams, source]);

  const setOperationId = useCallback(
    (operationId: string | null) => setParams(writeDeploymentRoute(operationId), { replace: true }),
    [setParams]
  );
  return { operationId: route.operationId, setOperationId };
}
