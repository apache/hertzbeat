/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Dropdown, Input, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { alertRuleExportFormats, type AlertRuleExportFormat } from '../model/alert-rule-export-model';
import styles from '../shared/alert-rule-list.module.css';

type AlertRuleListHeadingProps = {
  busy: boolean;
  exporting: boolean;
  selectedCount: number;
  create: () => void;
  importRules: () => void;
  removeSelected: () => unknown;
  exportSelected: (format: AlertRuleExportFormat) => unknown;
};

export function AlertRuleListHeading({
  busy,
  exporting,
  selectedCount,
  create,
  importRules,
  removeSelected,
  exportSelected
}: AlertRuleListHeadingProps) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('alertRules.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.description')}</Typography.Text>
      </div>
      <Space>
        <AlertRuleSelectedActions
          busy={busy}
          exporting={exporting}
          selectedCount={selectedCount}
          removeSelected={removeSelected}
          exportSelected={exportSelected}
        />
        <Button disabled={busy} onClick={importRules}>
          {t('alertRules.import.open')}
        </Button>
        <Button type="primary" disabled={busy} onClick={create}>
          {t('alertRules.new')}
        </Button>
      </Space>
    </header>
  );
}

function AlertRuleSelectedActions({
  busy,
  exporting,
  selectedCount,
  removeSelected,
  exportSelected
}: Omit<AlertRuleListHeadingProps, 'create' | 'importRules'>) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;
  const chooseFormat = (key: string) => {
    const format = alertRuleExportFormats.find(candidate => candidate === key);
    if (format) exportSelected(format);
  };
  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: alertRuleExportFormats.map(format => ({
            key: format,
            label: t(`alertRules.export.format.${format.toLowerCase()}`)
          })),
          onClick: ({ key }) => chooseFormat(key)
        }}
        disabled={busy || exporting}
      >
        <Button loading={exporting} disabled={busy}>
          {t('alertRules.export.selected')}
        </Button>
      </Dropdown>
      <Popconfirm
        title={t('alertRules.deleteSelectedConfirm', { count: selectedCount })}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true, disabled: busy }}
        onConfirm={removeSelected}
      >
        <Button danger disabled={busy}>
          {t('alertRules.deleteSelected')}
        </Button>
      </Popconfirm>
    </>
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
