/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { CollectorActionDialog } from '../components/collector-action-dialog';
import { CollectorIntakeDialog } from '../components/collector-intake-dialog';
import { CollectorList } from '../components/collector-list';
import { CollectorRuntimeConfigDialog } from '../components/collector-runtime-config-dialog';
import { CollectorToolbar } from '../components/collector-toolbar';
import { useCollectorController } from '../controller/use-collector-controller';
import type { CollectorMutationFailure } from '../model/collector-model';
import styles from './collector-page.module.css';

export function CollectorPage() {
  const { t } = useTranslation();
  const controller = useCollectorController();
  const selected = controller.selected;
  const submitSearch = () => controller.actions.submitName();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('collectors.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('collectors.description')}</Typography.Text>
      </header>
      {!controller.intakeEditor && !controller.runtimeEditor && controller.mutationFailure && (
        <MutationFailure failure={controller.mutationFailure} />
      )}
      <div className={styles.toolbar}>
        <CollectorToolbar
          name={controller.nameDraft}
          selected={selected}
          mutating={controller.mutating}
          refreshing={controller.refreshing}
          onName={controller.actions.setNameDraft}
          onSearch={submitSearch}
          onRefresh={controller.actions.refresh}
          onAction={controller.actions.requestAction}
        />
      </div>
      <CollectorList
        state={controller.listState}
        query={controller.query}
        selected={selected}
        busy={controller.mutating}
        onPage={controller.actions.setPage}
        onSelect={controller.actions.toggleSelection}
        onSelectAll={controller.actions.toggleAll}
        onAction={controller.actions.requestAction}
        onIntake={controller.actions.openIntake}
        onRuntime={name => void controller.actions.openRuntimeConfig(name)}
      />
      <CollectorDialogs controller={controller} />
    </div>
  );
}

function CollectorDialogs({ controller }: { controller: ReturnType<typeof useCollectorController> }) {
  return (
    <>
      <CollectorActionDialog
        command={controller.pendingAction}
        pending={controller.mutating}
        onCancel={controller.actions.cancelAction}
        onConfirm={controller.actions.confirmAction}
      />
      <CollectorIntakeDialog
        record={controller.intakeEditor?.record ?? null}
        saving={controller.intakeSaving}
        failure={controller.intakeFailure}
        onCancel={controller.actions.cancelIntake}
        onSave={request => void controller.actions.saveIntake(request)}
        onClear={() => void controller.actions.clearIntake()}
      />
      <CollectorRuntimeConfigDialog
        record={controller.runtimeEditor?.record ?? null}
        config={controller.runtimeEditor?.config ?? null}
        loading={controller.runtimeLoading}
        saving={controller.runtimeSaving}
        failure={controller.runtimeFailure}
        onCancel={controller.actions.cancelRuntimeConfig}
        onSave={draft => void controller.actions.saveRuntimeConfig(draft)}
        onOpenPrometheus={controller.actions.openPrometheusSources}
        onOpenFileLog={controller.actions.openFileLogSources}
        prometheus={{
          editor: controller.prometheusEditor,
          saving: controller.prometheusSaving,
          failure: controller.prometheusFailure,
          select: controller.actions.selectPrometheusTarget,
          apply: controller.actions.applyPrometheusTarget,
          remove: controller.actions.removePrometheusTarget,
          save: () => void controller.actions.savePrometheusSources(),
          back: controller.actions.cancelPrometheusSources,
          close: controller.actions.closePrometheusSources,
          cancelTarget: controller.actions.cancelPrometheusTarget
        }}
        fileLog={{
          editor: controller.fileLogEditor,
          saving: controller.fileLogSaving,
          failure: controller.fileLogFailure,
          select: controller.actions.selectFileLogSource,
          apply: controller.actions.applyFileLogSource,
          remove: controller.actions.removeFileLogSource,
          save: () => void controller.actions.saveFileLogSources(),
          back: controller.actions.cancelFileLogSources,
          close: controller.actions.closeFileLogSources,
          cancelSource: controller.actions.cancelFileLogSource
        }}
      />
    </>
  );
}

function MutationFailure({ failure }: { failure: CollectorMutationFailure }) {
  const { t } = useTranslation();
  return <Alert type="error" showIcon message={t(`collectors.failure.${failure}`)} />;
}
