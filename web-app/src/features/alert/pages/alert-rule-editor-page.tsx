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

import { Alert, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlertRuleDetailEvidence } from '../components/alert-rule-editor-evidence';
import { AlertRuleEditorActions, AlertRuleEditorWorkspace } from './alert-rule-editor-dialog-content';
import { useAlertRuleActionCapabilities } from '../controller/use-alert-rule-action-capabilities';
import { useAlertRuleEditorController } from '../controller/use-alert-rule-editor-controller';
import { useAlertRuleUnsavedHistory } from '../controller/use-alert-rule-unsaved-history';
import { type AlertRuleDraft } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleListPage } from './alert-rule-list-page';

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const capabilities = useAlertRuleActionCapabilities();
  if (capabilities.canWrite) return <AlertRuleEditorWorkspacePage mode={mode} />;
  return (
    <Alert
      type="warning"
      showIcon
      message={t('common.permission.roleRequiredTitle')}
      description={t('common.permission.roleRequiredDescription')}
    />
  );
}

function AlertRuleEditorWorkspacePage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useAlertRuleEditorController(mode);
  const { detail, draft } = controller.state;
  const cancel = controller.cancel;
  const requestClose = useAlertRuleUnsavedHistory(controller.state.dirty, cancel);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const missingNewStrategy = mode === 'new' && controller.state.requestedKind === null;
  useEffect(() => {
    if (missingNewStrategy) cancel();
  }, [cancel, missingNewStrategy]);
  const busy = controller.state.command === 'saving' || controller.state.recovery !== undefined;
  useAlertRuleDialogEscape({ busy, cancel: requestClose, enabled: !missingNewStrategy });
  if (missingNewStrategy) return <AlertRuleListPage />;
  const titleKey = resolveEditorTitleKey(mode, controller.state.requestedKind ?? draft?.kind ?? 'realtime');
  return (
    <>
      <AlertRuleListPage />
      <Modal
        open
        centered={false}
        closable={!busy}
        footer={
          detail.kind === 'ready' && draft ? (
            <AlertRuleEditorActions
              controller={controller}
              cancel={requestClose}
              validate={() => setValidationAttempted(true)}
            />
          ) : null
        }
        keyboard={false}
        maskClosable={false}
        rootClassName="hb-alert-rule-dialog-root"
        title={t(titleKey)}
        width="70%"
        onCancel={() => {
          if (!busy) requestClose();
        }}
      >
        <div className={styles.editorDialogBody}>
          <AlertRuleDetailEvidence state={detail} retry={controller.retryDetail} />
          {detail.kind === 'ready' && draft && (
            <AlertRuleEditorWorkspace controller={controller} draft={draft} validationAttempted={validationAttempted} />
          )}
        </div>
      </Modal>
    </>
  );
}

function useAlertRuleDialogEscape({ busy, cancel, enabled }: { busy: boolean; cancel: () => void; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target && !target.closest('.hb-alert-rule-dialog-root')) return;
      if (target?.closest('[role="combobox"][aria-expanded="true"]')) return;
      const sqlEditor = target?.closest('[data-hb-alert-sql-editor="codemirror"]');
      if (sqlEditor?.querySelector('.cm-tooltip-autocomplete')) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [busy, cancel, enabled]);
}

function resolveEditorTitleKey(mode: 'new' | 'edit', kind: AlertRuleDraft['kind']) {
  if (mode === 'new') return kind === 'periodic' ? 'alertRules.newPeriodic' : 'alertRules.newRealtime';
  return kind === 'periodic' ? 'alertRules.editPeriodic' : 'alertRules.editRealtime';
}
