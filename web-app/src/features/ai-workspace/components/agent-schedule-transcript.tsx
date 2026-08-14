/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Modal, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentScheduleViewModel } from '../model/agent-schedule-view-model';
import styles from './agent-schedule-view.module.css';

export function AgentScheduleTranscript({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  const transcript = controller.transcript;
  return (
    <Modal
      open={transcript.open}
      footer={null}
      width={760}
      title={t('aiSchedules.transcript.title', { name: transcript.schedule?.name ?? '' })}
      onCancel={controller.actions.closeTranscript}
    >
      {transcript.kind === 'loading' ? <Typography.Text>{t('aiSchedules.transcript.loading')}</Typography.Text> : null}
      {transcript.kind === 'empty' ? <Typography.Text>{t('aiSchedules.transcript.empty')}</Typography.Text> : null}
      {transcript.kind === 'error' ? (
        <Alert type="error" showIcon message={t('aiSchedules.transcript.unavailable')} />
      ) : null}
      {transcript.kind === 'ready' ? <TranscriptEntries controller={controller} /> : null}
    </Modal>
  );
}

function TranscriptEntries({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  const transcript = controller.transcript;
  return (
    <div className={styles.transcript}>
      {transcript.hasEarlier ? (
        <Button loading={transcript.loadingEarlier} onClick={() => void controller.actions.loadEarlierTranscript()}>
          {t('aiSchedules.transcript.loadEarlier')}
        </Button>
      ) : null}
      {transcript.entries.map(entry => (
        <article className={styles.transcriptEntry} key={entry.id}>
          <Space>
            <Tag>{entry.role}</Tag>
            <Typography.Text type="secondary">{entry.createdAt ?? ''}</Typography.Text>
          </Space>
          <p>{entry.text || t('aiSchedules.transcript.noText')}</p>
        </article>
      ))}
    </div>
  );
}
