/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-rule-list.module.css';

export function AlertRuleListHeading({ busy, create }: { busy: boolean; create: () => void }) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('alertRules.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.description')}</Typography.Text>
      </div>
      <Button type="primary" disabled={busy} onClick={create}>
        {t('alertRules.new')}
      </Button>
    </header>
  );
}

export function AlertRuleListToolbar({
  search,
  refreshing,
  busy,
  recovering,
  setSearch,
  submitSearch,
  refresh
}: {
  search: string;
  refreshing: boolean;
  busy: boolean;
  recovering: boolean;
  setSearch: (value: string) => void;
  submitSearch: () => void;
  refresh: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <Input
        allowClear
        value={search}
        placeholder={t('alertRules.search')}
        disabled={busy}
        onChange={event => setSearch(event.target.value)}
        onPressEnter={submitSearch}
      />
      <Button type="primary" disabled={busy} onClick={submitSearch}>
        {t('common.query')}
      </Button>
      <Button loading={refreshing} disabled={busy && !recovering} onClick={() => void refresh()}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}

export function AlertRuleListRecovery({ visible, retry }: { visible: boolean; retry: () => unknown }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t('alertRules.operationFailed')}
      description={t('common.routeError.description')}
      action={
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
