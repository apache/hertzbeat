/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
