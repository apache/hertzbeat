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

import { useCallback, useState } from 'react';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import type { useExplorePageController } from './use-explore-page-controller';
import { buildSubmissionPatch } from '../model/explore-submission-model';
import {
  logInspectorAnalysisAction,
  logInspectorAnalysisDisabledReason,
  type LogInspectorAnalysisControls,
  type LogInspectorAnalysisIntent
} from '../model/explore-log-inspector-analysis';

export function useLogInspectorAnalysis(controller: ReturnType<typeof useExplorePageController>, enabled: boolean) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [focusIntent, setFocusIntent] = useState<LogInspectorAnalysisIntent>();
  const onFocused = useCallback(() => setFocusIntent(undefined), []);
  const { query, submission, result } = controller;
  const draft = submission.draft;
  const controls: LogInspectorAnalysisControls = {};
  if (query.signal === 'logs' && !query.live && !query.logRecordUid && draft.signal === 'logs') {
    controls.logAnalysisDisabledReason =
      !enabled || result.kind !== 'ready'
        ? 'unavailable'
        : logInspectorAnalysisDisabledReason(query.logAnalysis, draft.logAnalysis);
    controls.onAnalyzeLogField = (target, intent) => {
      if (!enabled || result.kind !== 'ready') return false;
      const action = logInspectorAnalysisAction(query.logAnalysis, draft.logAnalysis, target, intent);
      if (action.kind !== 'ready') return false;
      const value = JSON.stringify(action.analysis);
      const validation = buildSubmissionPatch({ ...draft, logAnalysis: value });
      if (!validation.valid) {
        submission.submit();
        if (validation.errors.some(error => error.code === 'unclosed_quote'))
          void message.error(t('explore.logAuthoring.syntaxIssue.unclosed_quote'));
        return false;
      }
      submission.updateField({ field: 'logAnalysis', value });
      submission.submit();
      setFocusIntent(undefined);
      return true;
    };
  }
  return { controls, focusIntent, onFocused };
}
