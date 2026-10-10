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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { AgentScheduleViewModel } from '../model/agent-schedule-view-model';
import { AgentScheduleEditor } from './agent-schedule-editor';
import { AgentScheduleTable } from './agent-schedule-table';
import { AgentScheduleTranscript } from './agent-schedule-transcript';
import styles from './agent-schedule-view.module.css';

export function AgentScheduleView({ controller }: { controller: AgentScheduleViewModel }) {
  if (controller.list.kind !== 'ready') {
    return <ScheduleState controller={controller} />;
  }
  return (
    <>
      <MutationFailure controller={controller} />
      <AgentScheduleTable controller={controller} />
      <AgentScheduleEditor controller={controller} />
      <AgentScheduleTranscript controller={controller} />
    </>
  );
}

function ScheduleState({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  if (controller.list.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('aiSchedules.states.loading')} />;
  }
  if (controller.list.kind === 'empty') {
    return (
      <>
        <MutationFailure controller={controller} />
        <OperationalStatePanel
          kind="empty"
          title={t('aiSchedules.states.empty')}
          description={t('aiSchedules.states.emptyDescription')}
          action={<Button onClick={controller.actions.openCreate}>{t('aiSchedules.create')}</Button>}
        />
        <AgentScheduleEditor controller={controller} />
      </>
    );
  }
  return (
    <OperationalStatePanel
      kind="unavailable"
      title={t('aiSchedules.states.unavailable')}
      action={<Button onClick={() => void controller.actions.reload()}>{t('common.retry')}</Button>}
    />
  );
}

function MutationFailure({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  return controller.mutationFailed ? (
    <Alert className={styles.failure ?? ''} type="error" showIcon message={t('aiSchedules.states.mutationFailed')} />
  ) : null;
}
