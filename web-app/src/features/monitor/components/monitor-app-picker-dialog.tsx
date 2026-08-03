/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  ApiOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DesktopOutlined,
  GlobalOutlined,
  HddOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WifiOutlined
} from '@ant-design/icons';
import { Alert, Button, Empty, Input, Modal, Spin } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { MonitorAppsEvidence } from '../model/monitor-list-model';
import { filterMonitorAppPickerGroups } from '../model/monitor-app-picker-model';

import styles from './monitor-app-picker-dialog.module.css';

type MonitorAppPickerDialogProps = {
  open: boolean;
  search: string;
  evidence: MonitorAppsEvidence;
  onSearch: (value: string) => void;
  onCancel: () => void;
  onSelect: (app: string) => void;
};

const categoryIcons: Record<string, ReactNode> = {
  service: <ApiOutlined />,
  program: <CodeOutlined />,
  db: <DatabaseOutlined />,
  cache: <DatabaseOutlined />,
  os: <DesktopOutlined />,
  mid: <DeploymentUnitOutlined />,
  bigdata: <AppstoreOutlined />,
  webserver: <GlobalOutlined />,
  cn: <CloudServerOutlined />,
  network: <WifiOutlined />,
  server: <HddOutlined />,
  llm: <RobotOutlined />,
  custom: <ToolOutlined />,
  auto: <ThunderboltOutlined />
};

export function MonitorAppPickerDialog(props: MonitorAppPickerDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      centered
      destroyOnHidden
      open={props.open}
      width={900}
      title={t('monitor.appPicker.title')}
      footer={<Button onClick={props.onCancel}>{t('common.cancel')}</Button>}
      onCancel={props.onCancel}
      afterOpenChange={open => {
        if (!open) props.onSearch('');
      }}
    >
      <p className={styles.description}>{t('monitor.appPicker.description')}</p>
      <Input
        autoFocus
        allowClear
        type="search"
        aria-label={t('monitor.appPicker.search')}
        placeholder={t('monitor.appPicker.search')}
        value={props.search}
        onChange={event => props.onSearch(event.target.value)}
      />
      <PickerEvidence evidence={props.evidence} search={props.search} onSelect={props.onSelect} />
    </Modal>
  );
}

function PickerEvidence({
  evidence,
  search,
  onSelect
}: Pick<MonitorAppPickerDialogProps, 'evidence' | 'search' | 'onSelect'>) {
  const { t } = useTranslation();
  if (evidence.kind === 'loading') {
    return (
      <div className={styles.feedback} role="status">
        <Spin size="small" />
        <span>{t('monitor.appPicker.loading')}</span>
      </div>
    );
  }
  if (evidence.kind === 'unavailable') {
    return <Alert className={styles.feedback!} showIcon type="warning" message={t('common.unavailable')} />;
  }
  if (evidence.kind === 'error') {
    return <Alert className={styles.feedback!} showIcon type="error" message={t('common.routeError.description')} />;
  }

  const groups = filterMonitorAppPickerGroups(evidence.groups, search);
  if (!groups.length) {
    return (
      <Empty
        className={styles.empty!}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('monitor.appPicker.empty')}
      />
    );
  }

  return (
    <div className={styles.catalog}>
      {groups.map(group => {
        const categoryKey = `monitor.categories.${group.category}`;
        const translatedCategory = t(categoryKey);
        const categoryLabel = translatedCategory === categoryKey ? group.category.toUpperCase() : translatedCategory;
        return (
          <section className={styles.category} role="group" aria-label={categoryLabel} key={group.category}>
            <header className={styles.categoryHeader}>
              <span className={styles.categoryIcon} aria-hidden="true">
                {categoryIcons[group.category] ?? <AppstoreOutlined />}
              </span>
              <strong>{categoryLabel}</strong>
              <span className={styles.categoryCount}>{group.apps.length}</span>
            </header>
            <div className={styles.appGrid}>
              {group.apps.map(app => (
                <button className={styles.appButton} type="button" key={app.value} onClick={() => onSelect(app.value)}>
                  {app.label}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
