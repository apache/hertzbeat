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

import type { SetupErrorCode, SetupOperationState, SetupPhase, SetupWarningCode } from './setup-contract';

export type SetupUnlockResponse = {
  access: 'unlocked';
  expiresAt: string;
};

export type SetupValidationResult = {
  valid: boolean;
  observedAt: string;
  errorCode: SetupErrorCode | null;
  warnings: SetupWarningCode[];
};

export type SetupConfigurationAcknowledgement = {
  operationId: string;
  state: SetupOperationState;
  phase: SetupPhase;
  nextPollAfterMillis: number;
  exportAvailable: boolean;
};

export type SetupOperation = SetupConfigurationAcknowledgement & {
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: SetupErrorCode | null;
};

export type SetupErrorResponse = {
  errorCode: SetupErrorCode;
  observedAt: string;
};

export type SetupAdministratorResponse = {
  username: string;
  phase: 'optional_configuration';
};
