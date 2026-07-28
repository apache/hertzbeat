/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertRulePreview } from './alert-rule-preview';

export type AlertRuleEditorReadFailure = 'missing' | 'permission' | 'unavailable' | 'error';
export type AlertRuleEditorSaveFailure = 'permission' | 'validation' | 'unavailable' | 'error';
export type AlertRuleEditorDetailState = { kind: 'loading' } | { kind: AlertRuleEditorReadFailure } | { kind: 'ready' };
export type AlertRulePreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | ({ kind: 'ready' } & AlertRulePreview)
  | { kind: 'input' }
  | { kind: 'permission' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type AlertRuleSaveRecovery = {
  phase: 'proof' | 'commit-uncertain';
  failure: 'unavailable' | 'error';
  retryable: boolean;
};
