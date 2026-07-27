/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { MonitorEditorFormView } from '../components/monitor-editor-form-view';
import { useMonitorEditorController } from '../controller/use-monitor-editor-controller';
import styles from './monitor-editor-page.module.css';

export function MonitorEditorWorkspace({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useMonitorEditorController(mode);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>
          {t(mode === 'new' ? 'monitor.editor.newTitle' : 'monitor.editor.editTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('monitor.editor.description')}</Typography.Text>
      </header>
      <MonitorEditorFormView key={controller.state.sourceKey} mode={mode} controller={controller} />
    </div>
  );
}
