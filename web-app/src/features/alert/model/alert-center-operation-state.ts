/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertFailureKind, AlertGroupTargetStatus } from './alert-model';

export type AlertCenterStatusAction = 'acknowledge' | 'unacknowledge' | 'resolve' | 'reopen';

export type AlertCenterOperationCommand =
  'deleting' | 'acknowledging' | 'unacknowledging' | 'resolving' | 'reopening' | 'recovering' | 'idle';

type RecoveryEvidence = {
  ids: number[];
  phase: 'proof' | 'projection';
  failure: AlertFailureKind;
};

export type AlertCenterOperationRecovery =
  | (RecoveryEvidence & { kind: 'delete' })
  | (RecoveryEvidence & {
      kind: 'status';
      action: AlertCenterStatusAction;
      status: AlertGroupTargetStatus;
    });
