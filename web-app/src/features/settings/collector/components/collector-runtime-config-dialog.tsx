/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Form, Modal } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import type {
  ManagedFileLogSourceDraft,
  ManagedFileLogSourceSelection,
  ManagedFileLogSourceView
} from '../model/collector-file-log-source-model';
import type {
  ManagedPrometheusSourceView,
  ManagedPrometheusTargetDraft,
  ManagedPrometheusTargetSelection
} from '../model/collector-prometheus-source-model';
import type { ManagedRuntimeCoreDraft, ManagedRuntimeConfigView } from '../model/collector-runtime-config-model';
import { CollectorFileLogSourcesView } from './collector-file-log-sources-view';
import { CollectorPrometheusSourcesView } from './collector-prometheus-sources-view';
import { CollectorRuntimeCoreForm } from './collector-runtime-core-form';

type PrometheusProps = {
  editor: ManagedPrometheusSourceView | null;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  select: (selection: ManagedPrometheusTargetSelection) => void;
  apply: (target: ManagedPrometheusTargetDraft) => void;
  remove: (index: number) => void;
  save: () => void;
  back: () => void;
  close: () => void;
  cancelTarget: () => void;
};
type FileLogProps = {
  editor: ManagedFileLogSourceView | null;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  select: (selection: ManagedFileLogSourceSelection) => void;
  apply: (source: ManagedFileLogSourceDraft) => void;
  remove: (index: number) => void;
  save: () => void;
  back: () => void;
  close: () => void;
  cancelSource: () => void;
};
type Props = {
  record: CollectorRecord | null;
  config: ManagedRuntimeConfigView | null;
  loading: boolean;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  onCancel: () => void;
  onSave: (draft: ManagedRuntimeCoreDraft) => void;
  onOpenPrometheus: () => void;
  onOpenFileLog: () => void;
  prometheus: PrometheusProps;
  fileLog: FileLogProps;
};
type DialogMode = 'runtime' | 'prometheus' | 'fileLog';

export function CollectorRuntimeConfigDialog(props: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ManagedRuntimeCoreDraft>();
  if (!props.record) return null;
  const mode = dialogMode(props);
  const locked = props.saving || props.prometheus.saving || props.fileLog.saving;
  return (
    <Modal
      open
      destroyOnHidden
      width={720}
      title={t(dialogTitle(mode), { name: props.record.name })}
      okText={t('collectors.runtime.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: props.loading || props.saving || !props.config }}
      cancelButtonProps={{ disabled: props.saving }}
      confirmLoading={props.saving}
      footer={mode === 'runtime' ? undefined : null}
      closable={!locked}
      keyboard={!locked}
      maskClosable={false}
      onCancel={closeAction(props, mode)}
      onOk={() => form.submit()}
    >
      <DialogContent {...props} mode={mode} form={form} />
    </Modal>
  );
}

function DialogContent(props: Props & { mode: DialogMode; form: FormInstance<ManagedRuntimeCoreDraft> }) {
  if (props.mode === 'prometheus' && props.prometheus.editor && props.config) {
    return (
      <CollectorPrometheusSourcesView
        view={props.prometheus.editor}
        fileLogSourceCount={props.config.fileLogSourceCount}
        saving={props.prometheus.saving}
        failure={props.prometheus.failure}
        onSelect={props.prometheus.select}
        onApply={props.prometheus.apply}
        onRemove={props.prometheus.remove}
        onSave={props.prometheus.save}
        onCancel={props.prometheus.back}
        onCancelTarget={props.prometheus.cancelTarget}
      />
    );
  }
  if (props.mode === 'fileLog' && props.fileLog.editor && props.config) {
    return (
      <CollectorFileLogSourcesView
        view={props.fileLog.editor}
        prometheusTargetCount={props.config.prometheusTargetCount}
        saving={props.fileLog.saving}
        failure={props.fileLog.failure}
        onSelect={props.fileLog.select}
        onApply={props.fileLog.apply}
        onRemove={props.fileLog.remove}
        onSave={props.fileLog.save}
        onCancel={props.fileLog.back}
        onCancelSource={props.fileLog.cancelSource}
      />
    );
  }
  return (
    <CollectorRuntimeCoreForm
      config={props.config}
      loading={props.loading}
      saving={props.saving}
      failure={props.failure}
      form={props.form}
      onSave={props.onSave}
      onOpenPrometheus={props.onOpenPrometheus}
      onOpenFileLog={props.onOpenFileLog}
    />
  );
}

function dialogMode(props: Props): DialogMode {
  if (props.prometheus.editor) return 'prometheus';
  if (props.fileLog.editor) return 'fileLog';
  return 'runtime';
}

function dialogTitle(mode: DialogMode) {
  if (mode === 'prometheus') return 'collectors.runtime.prometheus.title';
  if (mode === 'fileLog') return 'collectors.runtime.fileLog.title';
  return 'collectors.runtime.title';
}

function closeAction(props: Props, mode: DialogMode) {
  if (mode === 'prometheus') return props.prometheus.close;
  if (mode === 'fileLog') return props.fileLog.close;
  return props.onCancel;
}
