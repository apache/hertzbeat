/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../../alert-policy-page.module.css';
import { NoticeRuleEditor } from '../components/notice-rule-editor';
import { NoticeRuleTable } from '../components/notice-rule-table';
import { NoticeRuleToolbar } from '../components/notice-rule-toolbar';
import { useNoticeRuleController } from '../controller/notice-rule-controller';

type OptionKind = 'loading' | 'ready' | 'empty' | 'invalid' | 'unavailable' | 'error';

function optionAlert(kind: OptionKind) {
  if (kind === 'ready' || kind === 'loading') return null;
  const type = kind === 'empty' ? 'info' : 'warning';
  return { messageKey: `noticeRules.options.${kind}`, type } as const;
}

export function NoticeRulePage() {
  const { t } = useTranslation();
  const { state, actions } = useNoticeRuleController();
  const alert = optionAlert(state.options.kind);
  const busy = state.command !== 'idle';
  const dependenciesReady = state.options.kind === 'ready';
  const tableActions = {
    changePage: actions.changePage,
    edit: (id: number) => void actions.edit(id),
    remove: actions.remove,
    toggle: actions.toggle
  };
  return (
    <div className={styles.page}>
      <NoticeRuleToolbar
        name={state.name}
        createDisabled={!dependenciesReady || busy}
        onNameChange={actions.setName}
        onQuery={actions.search}
        onRefresh={() => void actions.refresh()}
        onCreate={actions.create}
      />
      {alert ? <Alert type={alert.type} showIcon message={t(alert.messageKey)} /> : null}
      <NoticeRuleTable
        actions={tableActions}
        busy={busy}
        dependenciesReady={dependenciesReady}
        state={state.list}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        togglingRuleId={state.togglingRuleId}
      />
      {state.draft ? (
        <NoticeRuleEditor
          draft={state.draft}
          receivers={state.receivers}
          templates={state.templates}
          saving={state.saving}
          dependenciesReady={dependenciesReady}
          selectReceivers={actions.selectReceivers}
          update={actions.updateDraft}
          close={actions.close}
          submit={() => void actions.submit()}
        />
      ) : null}
    </div>
  );
}
