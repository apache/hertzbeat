/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalSection } from '@/shared/operational-page';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import {
  MonitorEditorCollectionFields,
  MonitorEditorNameField,
  MonitorEditorSourceFields
} from './monitor-editor-core-fields';
import type { MonitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorGrafanaFields } from './monitor-grafana-fields';
import { MonitorEditorMetadataFields } from './monitor-editor-metadata-fields';
import {
  MonitorEditorApplicationParams,
  MonitorEditorDiscoveryParams,
  MonitorEditorHostParam
} from './monitor-editor-param-sections';
import styles from './monitor-editor-form-view.module.css';

type MonitorEditorParamContext = ComponentProps<typeof MonitorEditorHostParam>['context'];

export function MonitorEditorConnectionSection({
  mode,
  controller,
  draft,
  context,
  onChangeApplication
}: {
  mode: 'new' | 'edit';
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
  context: MonitorEditorParamContext;
  onChangeApplication: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OperationalSection title={t('monitor.editor.connection')}>
      <div className={`${styles.formRail} ${styles.form}`}>
        <MonitorEditorSourceFields
          mode={mode}
          controller={controller}
          draft={draft}
          onChangeApplication={onChangeApplication}
        />
        <MonitorEditorHostParam context={context} />
        <MonitorEditorDiscoveryParams context={context} />
        <MonitorEditorNameField controller={controller} draft={draft} />
        <MonitorEditorApplicationParams context={context} />
        <MonitorEditorCollectionFields controller={controller} draft={draft} />
      </div>
    </OperationalSection>
  );
}

export function MonitorEditorMetadataSection({
  controller,
  draft,
  labels,
  visible,
  toggle
}: {
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
  labels: MonitorEditorFieldLabels;
  visible: boolean;
  toggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className={`${styles.formRail} ${styles.metadataDisclosure}`}>
        <Button type="text" aria-expanded={visible} disabled={controller.state.busy} onClick={toggle}>
          {t(visible ? 'monitor.editor.hideMetadata' : 'monitor.editor.showMetadata')}
        </Button>
      </div>
      {visible ? (
        <OperationalSection title={t('monitor.editor.metadata')}>
          <div className={`${styles.formRail} ${styles.form}`}>
            <MonitorEditorMetadataFields controller={controller} draft={draft} labels={labels} />
            <MonitorGrafanaFields
              draft={draft}
              update={controller.actions.updateGrafana}
              disabled={controller.state.busy}
            />
          </div>
        </OperationalSection>
      ) : null}
    </>
  );
}
