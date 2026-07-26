/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertGroupTargetStatus } from './alert-model';

export type AlertCenterOperationCommand = 'deleting' | 'resolving' | 'reopening' | 'recovering' | 'idle';

type RecoveryEvidence = {
  ids: number[];
  phase: 'proof' | 'projection';
  failure: 'unavailable' | 'error';
};

export type AlertCenterOperationRecovery =
  (RecoveryEvidence & { kind: 'delete' }) | (RecoveryEvidence & { kind: 'status'; status: AlertGroupTargetStatus });
