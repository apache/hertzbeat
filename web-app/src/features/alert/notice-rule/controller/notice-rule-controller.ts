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

import { useNoticeRuleCommandController } from './notice-rule-command-controller';
import { useNoticeRulePageCorrection } from './use-notice-rule-page-correction';
import { useNoticeRuleQueryController } from './notice-rule-query-controller';
import { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';
import { canPersistNoticeRule } from './notice-rule-action-admission';

export function useNoticeRuleController() {
  const queryController = useNoticeRuleQueryController();
  const options = useNoticeRuleOptions();
  const list = useNoticeRuleList(queryController.query);
  useNoticeRulePageCorrection(queryController.query, list.state, queryController.replacePageIndex);
  const commandController = useNoticeRuleCommandController({ list, options });
  const { gate, editor } = commandController;

  return {
    state: {
      command: gate.command,
      capabilities: commandController.capabilities,
      canRetryOperation: commandController.canRetryOperation,
      canSubmitDraft: canPersistNoticeRule(commandController.capabilities, editor.draft),
      detail: editor.detail,
      draft: editor.draft,
      list: list.state,
      name: queryController.name,
      options: { kind: options.kind, missingPrerequisite: options.missingPrerequisite },
      recovery: gate.recovery,
      query: queryController.query,
      receivers: options.receivers,
      refreshing: list.refreshing,
      saving: gate.command === 'saving',
      templates: options.templates,
      togglingRuleId: gate.togglingRuleId
    },
    actions: {
      changePage: queryController.changePage,
      ...editor.actions,
      refresh: list.refresh,
      ...commandController.actions,
      search: queryController.search,
      setName: queryController.setName
    }
  };
}
