/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../../alert-policy-page.module.css';
import { NoticeReceiverEditor } from '../components/notice-receiver-editor';
import { NoticeReceiverResults } from '../components/notice-receiver-results';
import { useNoticeReceiverController } from '../controller/notice-receiver-controller';

export function NoticeReceiverPage() {
  const { t } = useTranslation();
  const { state, actions } = useNoticeReceiverController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('noticeReceivers.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('noticeReceivers.description')}</Typography.Text>
        </div>
        <Button type="primary" disabled={state.busy} onClick={actions.create}>
          {t('noticeReceivers.new')}
        </Button>
      </header>
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={state.name}
          placeholder={t('noticeReceivers.search')}
          onChange={event => actions.setName(event.target.value)}
          onPressEnter={() => void actions.search()}
        />
        <Button type="primary" onClick={actions.search}>
          {t('common.query')}
        </Button>
        <Button loading={state.refreshing} onClick={() => void actions.refresh()}>
          {t('common.refresh')}
        </Button>
      </div>
      <NoticeReceiverResults
        state={state.list}
        busy={state.busy}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        edit={id => void actions.edit(id)}
        remove={record => void actions.remove(record)}
        onPageChange={actions.changePage}
      />
      {state.draft ? (
        <NoticeReceiverEditor
          draft={state.draft}
          saving={state.saving}
          testing={state.testing}
          busy={state.busy}
          update={actions.updateDraft}
          selectType={actions.selectType}
          setSecretCleared={actions.setSecretCleared}
          close={actions.close}
          submit={() => void actions.submit()}
          test={() => void actions.sendTest()}
        />
      ) : null}
    </div>
  );
}
