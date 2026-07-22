/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertGroupConverge, AlertGroupDraft } from './alert-group-model';

type PersistedAlertGroupDraft = AlertGroupDraft & { id: number };
type AlertGroupOperationPhase = 'prepare' | 'write' | 'proof' | 'projection';

export type AlertGroupOperationReceipt =
  | {
      kind: 'update';
      phase: Exclude<AlertGroupOperationPhase, 'prepare'>;
      draft: PersistedAlertGroupDraft;
    }
  | {
      kind: 'toggle';
      phase: AlertGroupOperationPhase;
      id: number;
      enable: boolean;
      current?: AlertGroupConverge;
    }
  | {
      kind: 'delete';
      phase: Exclude<AlertGroupOperationPhase, 'prepare'>;
      id: number;
    };

export type AlertGroupOperationRecovery = {
  kind: AlertGroupOperationReceipt['kind'];
  phase: 'proof' | 'projection';
  failure: 'unavailable' | 'error';
  retryable: true;
};
