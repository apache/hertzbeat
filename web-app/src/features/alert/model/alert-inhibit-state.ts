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

import type { RemotePageState } from '@/shared/remote-state';

import type { AlertInhibit, AlertInhibitDraft, AlertInhibitFailure } from './alert-inhibit-model';

export type AlertInhibitDetailState =
  { kind: 'idle' } | { kind: 'loading'; id: number } | { kind: AlertInhibitFailure; id: number };

export type AlertInhibitListState = RemotePageState<AlertInhibit, 'unavailable' | 'error'>;
export type AlertInhibitPrefillState = 'idle' | 'loading' | 'received' | 'manual' | 'unavailable' | 'error';

type AlertInhibitReceiptPhase = 'prepare' | 'write' | 'proof' | 'projection';
type AlertInhibitWritable = Omit<AlertInhibit, 'enable'> & { enable: boolean };

export type AlertInhibitReceipt =
  | {
      kind: 'save';
      phase: Exclude<AlertInhibitReceiptPhase, 'prepare'>;
      draft: AlertInhibitDraft;
      id?: number;
    }
  | {
      kind: 'toggle';
      phase: AlertInhibitReceiptPhase;
      record: AlertInhibit;
      enable: boolean;
      expected?: AlertInhibitWritable;
    }
  | {
      kind: 'delete';
      phase: Exclude<AlertInhibitReceiptPhase, 'prepare'>;
      ids: number[];
    };

export type AlertInhibitRecovery = {
  kind: AlertInhibitReceipt['kind'];
  phase: 'proof' | 'projection' | 'commit-uncertain';
  retryable: boolean;
};
