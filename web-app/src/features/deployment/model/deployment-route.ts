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
