/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
