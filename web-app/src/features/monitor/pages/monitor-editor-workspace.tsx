/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { MonitorEditorFormView } from '../components/monitor-editor-form-view';
import { useMonitorEditorController } from '../controller/use-monitor-editor-controller';

export function MonitorEditorWorkspace({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useMonitorEditorController(mode);
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t(mode === 'new' ? 'monitor.editor.newTitle' : 'monitor.editor.editTitle')}
        description={t('monitor.editor.description')}
      />
      <MonitorEditorFormView key={controller.state.sourceKey} mode={mode} controller={controller} />
    </OperationalPage>
  );
}
