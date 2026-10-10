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

import type { NoticeRuleMutationVariables } from './notice-rule-model';

type NoticeRuleOperationPhase = 'write' | 'proof' | 'projection';

type DraftReceipt = {
  phase: NoticeRuleOperationPhase;
  variables: NoticeRuleMutationVariables;
};

export type NoticeRuleOperationReceipt =
  | (Omit<DraftReceipt, 'phase'> & {
      kind: 'create';
      phase: NoticeRuleOperationPhase | 'commit-uncertain';
      previousIds: ReadonlySet<number>;
    })
  | (DraftReceipt & { kind: 'update'; id: number })
  | (DraftReceipt & { kind: 'toggle'; id: number })
  | { kind: 'delete'; phase: NoticeRuleOperationPhase; id: number };

export type NoticeRuleOperationRecovery =
  | {
      kind: NoticeRuleOperationReceipt['kind'];
      phase: 'proof' | 'projection';
      failure: 'unavailable' | 'error';
      retryable: true;
    }
  | {
      kind: 'create';
      phase: 'commit-uncertain';
      failure: 'commit-uncertain';
      retryable: false;
    };
