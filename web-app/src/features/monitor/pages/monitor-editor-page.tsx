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

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { MonitorEditorFormView } from '../components/monitor-editor-form-view';
import { useMonitorEditorController } from '../controller/use-monitor-editor-controller';
import styles from './monitor-editor-page.module.css';

export function MonitorEditorPage({ mode }: { mode: 'new' | 'edit' }) {
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
