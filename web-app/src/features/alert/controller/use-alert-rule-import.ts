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

import { App } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  validateAlertRuleImportFile,
  type AlertRuleImportInvalidKind,
  type AlertRuleImportState
} from '../model/alert-rule-import-model';
import { useAlertRuleImportOperation } from './use-alert-rule-import-operation';

export function useAlertRuleImport(reread: () => Promise<unknown>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AlertRuleImportState['draft']>(null);
  const [invalid, setInvalid] = useState<AlertRuleImportInvalidKind | null>(null);
  const operation = useAlertRuleImportOperation(reread);

  const open = () => {
    if (operation.busy || draft) return;
    setDraft({ file: null });
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const cancel = () => {
    if (operation.busy) return;
    setDraft(null);
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const selectFile = (file: File | null) => {
    if (operation.busy || operation.inspectionRequired) return;
    setDraft(current => (current ? { file } : current));
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const submit = async () => {
    if (!draft || operation.busy || operation.inspectionRequired) return false;
    const validation = validateAlertRuleImportFile(draft.file);
    if (!validation.valid) {
      setInvalid(validation.reason);
      return false;
    }
    const imported = await operation.execute(validation.file);
    if (imported) {
      setDraft(null);
      setInvalid(null);
      void message.success(t('alertRules.import.success'));
    }
    return imported;
  };
  const inspect = async () => {
    const inspected = await operation.inspect();
    if (inspected) {
      // Close the modal so the operator actually sees the refreshed list
      // before choosing whether a second import is safe.
      setDraft(null);
      setInvalid(null);
    }
    return inspected;
  };

  return {
    state: {
      draft,
      invalid,
      failure: operation.failure,
      busy: operation.busy,
      inspectionRequired: operation.inspectionRequired
    } satisfies AlertRuleImportState,
    actions: { open, cancel, selectFile, submit, inspect }
  };
}
