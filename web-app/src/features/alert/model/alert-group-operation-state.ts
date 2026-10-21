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
      ids: number[];
    };

export type AlertGroupOperationRecovery = {
  kind: AlertGroupOperationReceipt['kind'];
  phase: 'proof' | 'projection';
  failure: 'unavailable' | 'error';
  retryable: true;
};
