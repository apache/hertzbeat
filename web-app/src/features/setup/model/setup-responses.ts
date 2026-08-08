/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
