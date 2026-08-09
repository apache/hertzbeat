/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type DeploymentRoute = { operationId: string | null; invalid: boolean };

const operationIdentity = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

export function readDeploymentRoute(params: URLSearchParams): DeploymentRoute {
  const keys = [...params.keys()];
  const values = params.getAll('operationId');
  if (keys.some(key => key !== 'operationId') || values.length > 1) return { operationId: null, invalid: true };
  if (values.length === 0) return { operationId: null, invalid: false };
  const operationId = values[0] ?? '';
  return isDeploymentOperationId(operationId) ? { operationId, invalid: false } : { operationId: null, invalid: true };
}

export function writeDeploymentRoute(operationId: string | null) {
  const params = new URLSearchParams();
  if (operationId && isDeploymentOperationId(operationId)) params.set('operationId', operationId);
  return params;
}

export function isDeploymentOperationId(value: string) {
  return operationIdentity.test(value);
}
