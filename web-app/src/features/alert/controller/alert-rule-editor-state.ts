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

import type { AlertRuleDraft } from '../model/alert-rule-model';
import type {
  AlertRulePreviewState,
  AlertRuleEditorSaveFailure,
  AlertRuleSaveRecovery
} from '../model/alert-rule-editor-evidence';

export type { AlertRuleEditorDetailState, AlertRuleSaveRecovery } from '../model/alert-rule-editor-evidence';

export type AlertRuleRouteState = {
  source: string;
  token: symbol;
  draft: AlertRuleDraft | null;
  preview: AlertRulePreviewState;
  command: 'idle' | 'saving';
  saveFailure: AlertRuleEditorSaveFailure | undefined;
  recovery: AlertRuleSaveRecovery | undefined;
};

export type AlertRuleEditorOperationIdentity = {
  routeToken: symbol;
  editorEpoch: number;
};

export type AlertRuleEditorIdentityController = {
  capture: () => AlertRuleEditorOperationIdentity;
  invalidate: () => void;
  isCurrent: (identity: AlertRuleEditorOperationIdentity) => boolean;
};

export type AlertRuleRouteUpdate = (patch: Partial<AlertRuleRouteState>) => void;

export function freshAlertRuleRouteState(
  source: string,
  token: symbol,
  draft: AlertRuleDraft | null
): AlertRuleRouteState {
  return {
    source,
    token,
    draft,
    preview: { kind: 'idle' },
    command: 'idle',
    saveFailure: undefined,
    recovery: undefined
  };
}
