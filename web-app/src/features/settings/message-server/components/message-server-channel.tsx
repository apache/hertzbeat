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

import { Alert, Button, Skeleton, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './message-server-channel.module.css';

type FailureKind = 'permission' | 'unavailable' | 'error' | 'invalid';
type ChannelStatus = 'enabled' | 'disabled' | 'unconfigured';

export function MessageServerChannelLoading({ title }: { title: string }) {
  return (
    <section className={styles.channelRow} aria-label={title}>
      <Skeleton active paragraph={{ rows: 1 }} />
    </section>
  );
}

export function MessageServerChannelFailure({
  title,
  kind,
  retry
}: {
  title: string;
  kind: FailureKind;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.channelRow}>
      <Typography.Title level={4}>{title}</Typography.Title>
      <div className={styles.channelError}>
        <Alert type="error" showIcon message={t(`messageServer.read.${kind}`)} />
      </div>
      <Button onClick={retry}>{t('common.retry')}</Button>
    </section>
  );
}

export function MessageServerChannelRow({
  title,
  description,
  summary,
  status,
  disabled = false,
  canConfigure,
  action
}: {
  title: string;
  description: string;
  summary: string;
  status: ChannelStatus;
  disabled?: boolean;
  canConfigure: boolean;
  action: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.channelRow}>
      <div>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      <div className={styles.summary}>
        <Tag color={statusColor(status)}>{t(`messageServer.status.${status}`)}</Tag>
        <Typography.Text>{summary}</Typography.Text>
      </div>
      {canConfigure && (
        <Button disabled={disabled} onClick={action}>
          {t('messageServer.configure')}
        </Button>
      )}
    </section>
  );
}

function statusColor(status: ChannelStatus) {
  switch (status) {
    case 'enabled':
      return 'success';
    case 'disabled':
      return 'default';
    case 'unconfigured':
      return 'warning';
  }
}
