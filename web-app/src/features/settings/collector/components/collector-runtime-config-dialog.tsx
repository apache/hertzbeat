/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Checkbox, Empty, Form, Input, InputNumber, Modal, Skeleton, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import {
  managedRuntimeCoreDraft,
  managedRuntimeFilterPresets,
  managedRuntimeHostMetricsIntervalLimits,
  managedRuntimeHostScrapers,
  managedRuntimeResourceDetectors,
  type ManagedRuntimeCoreDraft,
  type ManagedRuntimeConfigView
} from '../model/collector-runtime-config-model';
import {
  type ManagedPrometheusSourceView,
  type ManagedPrometheusTargetDraft,
  type ManagedPrometheusTargetSelection
} from '../model/collector-prometheus-source-model';
import { CollectorPrometheusSourcesView } from './collector-prometheus-sources-view';
import { CollectorRuntimeSourceSummary } from './collector-runtime-source-summary';

type Props = {
  record: CollectorRecord | null;
  config: ManagedRuntimeConfigView | null;
  loading: boolean;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  prometheusEditor: ManagedPrometheusSourceView | null;
  prometheusSaving: boolean;
  prometheusFailure: CollectorMutationFailure | null;
  onCancel: () => void;
  onSave: (draft: ManagedRuntimeCoreDraft) => void;
  onOpenPrometheus: () => void;
  onSelectPrometheus: (selection: ManagedPrometheusTargetSelection) => void;
  onApplyPrometheus: (target: ManagedPrometheusTargetDraft) => void;
  onRemovePrometheus: (index: number) => void;
  onSavePrometheus: () => void;
  onCancelPrometheus: () => void;
  onClosePrometheus: () => void;
  onCancelPrometheusTarget: () => void;
};

export function CollectorRuntimeConfigDialog(props: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ManagedRuntimeCoreDraft>();
  if (!props.record) return null;
  const prometheusEditor = props.prometheusEditor;
  const prometheusOpen = prometheusEditor !== null;
  const locked = props.saving || props.prometheusSaving;
  return (
    <Modal
      open
      destroyOnHidden
      width={720}
      title={t(prometheusOpen ? 'collectors.runtime.prometheus.title' : 'collectors.runtime.title', {
        name: props.record.name
      })}
      okText={t('collectors.runtime.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: props.loading || props.saving || !props.config }}
      cancelButtonProps={{ disabled: props.saving }}
      confirmLoading={props.saving}
      footer={prometheusOpen ? null : undefined}
      closable={!locked}
      keyboard={!locked}
      maskClosable={false}
      onCancel={prometheusOpen ? props.onClosePrometheus : props.onCancel}
      onOk={() => form.submit()}
    >
      {prometheusEditor && props.config ? (
        <CollectorPrometheusSourcesView
          view={prometheusEditor}
          fileLogSourceCount={props.config.fileLogSourceCount}
          saving={props.prometheusSaving}
          failure={props.prometheusFailure}
          onSelect={props.onSelectPrometheus}
          onApply={props.onApplyPrometheus}
          onRemove={props.onRemovePrometheus}
          onSave={props.onSavePrometheus}
          onCancel={props.onCancelPrometheus}
          onCancelTarget={props.onCancelPrometheusTarget}
        />
      ) : (
        <>
          {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
          <RuntimeConfigBody {...props} form={form} />
        </>
      )}
    </Modal>
  );
}

function RuntimeConfigBody(props: Props & { form: FormInstance<ManagedRuntimeCoreDraft> }) {
  const { t } = useTranslation();
  if (props.config) return <RuntimeConfigForm {...props} config={props.config} form={props.form} />;
  if (props.loading) {
    return (
      <div data-testid="runtime-config-loading">
        <Skeleton active />
      </div>
    );
  }
  return <Empty description={t('collectors.runtime.loadFailed')} />;
}

function RuntimeConfigForm(
  props: Props & { config: ManagedRuntimeConfigView; form: FormInstance<ManagedRuntimeCoreDraft> }
) {
  return (
    <Form<ManagedRuntimeCoreDraft>
      form={props.form}
      layout="vertical"
      disabled={props.saving}
      initialValues={managedRuntimeCoreDraft(props.config)}
      onFinish={props.onSave}
    >
      <RuntimeBasics />
      <RuntimeHostScrapers />
      <RuntimeGovernance />
      <CollectorRuntimeSourceSummary config={props.config} onManagePrometheus={props.onOpenPrometheus} />
    </Form>
  );
}

function RuntimeBasics() {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item name="environment" label={t('collectors.runtime.environment')}>
        <Input />
      </Form.Item>
      <Form.Item name="hostMetricsEnabled" label={t('collectors.runtime.hostMetrics')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="hostMetricsIntervalSeconds" label={t('collectors.runtime.intervalSeconds')}>
        <InputNumber
          min={managedRuntimeHostMetricsIntervalLimits.minimum}
          max={managedRuntimeHostMetricsIntervalLimits.maximum}
          precision={0}
        />
      </Form.Item>
    </>
  );
}

function RuntimeHostScrapers() {
  const { t } = useTranslation();
  return (
    <Form.Item name="hostMetricsScrapers" label={t('collectors.runtime.scrapers')}>
      <Checkbox.Group>
        {managedRuntimeHostScrapers.map(scraper => (
          <Checkbox key={scraper} value={scraper}>
            {t(`collectors.runtime.scraper.${scraper}`)}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </Form.Item>
  );
}

function RuntimeGovernance() {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item name="resourceDetectors" label={t('collectors.runtime.detectors')}>
        <Checkbox.Group>
          {managedRuntimeResourceDetectors.map(detector => (
            <Checkbox key={detector} value={detector}>
              {t(`collectors.runtime.detector.${detector}`)}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Form.Item>
      <Form.Item name="telemetryFilterPresets" label={t('collectors.runtime.filterPresets')}>
        <Checkbox.Group>
          {managedRuntimeFilterPresets.map(preset => (
            <Checkbox key={preset} value={preset}>
              {t(`collectors.runtime.filter.${preset}`)}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Form.Item>
    </>
  );
}
