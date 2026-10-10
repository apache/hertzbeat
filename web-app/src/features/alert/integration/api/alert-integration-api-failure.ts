/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { AlertIntegrationContractError, AlertIntegrationRequestFailure } from '../model/alert-integration-model';

export function normalizeAlertIntegrationFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  if (isPermissionFailure(error.status)) return new AlertIntegrationRequestFailure('permission');
  if (isMalformedSuccessfulEnvelope(error)) {
    return new AlertIntegrationContractError();
  }
  return new AlertIntegrationRequestFailure(isUnavailableFailure(error) ? 'unavailable' : 'error');
}

function isPermissionFailure(status: number | undefined) {
  return status === 401 || status === 403;
}

function isMalformedSuccessfulEnvelope(error: ApiMessageError) {
  return error.status !== undefined && error.status >= 200 && error.status <= 299 && error.code === undefined;
}

function isUnavailableFailure(error: ApiMessageError) {
  return (
    error.cause !== undefined ||
    error.status === undefined ||
    error.status === 0 ||
    (error.status >= 500 && error.status <= 599)
  );
}

export async function alertIntegrationApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeAlertIntegrationFailure(error);
  }
}
