/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Checkbox, Empty, Form, Input, InputNumber, Modal, Skeleton, Switch, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import {
  managedRuntimeFilterPresets,
  managedRuntimeHostScrapers,
  managedRuntimeResourceDetectors,
  type ManagedRuntimeCoreDraft,
  type ManagedRuntimeConfigView
} from '../model/collector-runtime-config-model';

type Props = {
  record: CollectorRecord | null;
  config: ManagedRuntimeConfigView | null;
  loading: boolean;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  onCancel: () => void;
  onSave: (draft: ManagedRuntimeCoreDraft) => void;
};

export function CollectorRuntimeConfigDialog(props: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ManagedRuntimeCoreDraft>();
  if (!props.record) return null;
  return (
    <Modal
      open
      destroyOnHidden
      width={720}
      title={t('collectors.runtime.title', { name: props.record.name })}
      okText={t('collectors.runtime.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: props.loading || props.saving || !props.config }}
      cancelButtonProps={{ disabled: props.saving }}
      confirmLoading={props.saving}
      closable={!props.saving}
      keyboard={!props.saving}
      maskClosable={false}
      onCancel={props.onCancel}
      onOk={() => form.submit()}
    >
      {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
      <RuntimeConfigBody {...props} form={form} />
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
      initialValues={initialValues(props.config)}
      onFinish={props.onSave}
    >
      <RuntimeBasics />
      <RuntimeHostScrapers />
      <RuntimeGovernance />
      <RuntimeSourceSummary config={props.config} />
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
        <InputNumber min={10} max={300} precision={0} />
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

function RuntimeSourceSummary({ config }: { config: ManagedRuntimeConfigView }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="info"
      showIcon
      message={t('collectors.runtime.sources')}
      description={
        <div>
          <Typography.Text>
            {t('collectors.runtime.schemaRevision', { schema: config.schemaVersion, revision: config.revision })}
          </Typography.Text>
          {config.schemaVersion < 3 && (
            <>
              <br />
              <Typography.Text type="warning">{t('collectors.runtime.upgradeNotice')}</Typography.Text>
            </>
          )}
          <br />
          <Typography.Text>
            {t('collectors.runtime.prometheusSummary', { count: config.prometheusTargetCount })}
          </Typography.Text>
          <br />
          <Typography.Text>
            {t('collectors.runtime.fileLogSummary', { count: config.fileLogSourceCount })}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">{t('collectors.runtime.sourceNotice')}</Typography.Text>
        </div>
      }
    />
  );
}

function initialValues(config: ManagedRuntimeConfigView): ManagedRuntimeCoreDraft {
  return {
    environment: config.environment,
    hostMetricsEnabled: config.hostMetricsEnabled,
    hostMetricsIntervalSeconds: config.hostMetricsIntervalSeconds,
    hostMetricsScrapers: [...config.hostMetricsScrapers],
    resourceDetectors: [...config.resourceDetectors],
    telemetryFilterPresets: [...config.telemetryFilterPresets]
  };
}
