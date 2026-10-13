/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { MonitorEditorFormView } from '../components/monitor-editor-form-view';
import { MonitorHelpLink } from '../components/monitor-help-link';
import { useMonitorEditorController } from '../controller/use-monitor-editor-controller';

export function MonitorEditorWorkspace({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useMonitorEditorController(mode);
  return (
    <OperationalPage mode="form">
      <OperationalPageHeader
        title={t(mode === 'new' ? 'monitor.editor.newTitle' : 'monitor.editor.editTitle')}
        description={t('monitor.editor.description')}
        actions={<MonitorHelpLink href={controller.state.helpUrl} />}
      />
      <MonitorEditorFormView key={controller.state.sourceKey} mode={mode} controller={controller} />
    </OperationalPage>
  );
}
