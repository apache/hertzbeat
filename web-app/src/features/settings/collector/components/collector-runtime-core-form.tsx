/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Checkbox, Empty, Form, Input, InputNumber, Skeleton, Switch } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationFailure } from '../model/collector-model';
import {
  managedRuntimeCoreDraft,
  managedRuntimeFilterPresets,
  managedRuntimeHostMetricsIntervalLimits,
  managedRuntimeHostScrapers,
  managedRuntimeResourceDetectors,
  type ManagedRuntimeCoreDraft,
  type ManagedRuntimeConfigView
} from '../model/collector-runtime-config-model';
import { CollectorRuntimeSourceSummary } from './collector-runtime-source-summary';

type Props = {
  config: ManagedRuntimeConfigView | null;
  loading: boolean;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  form: FormInstance<ManagedRuntimeCoreDraft>;
  onSave: (draft: ManagedRuntimeCoreDraft) => void;
  onOpenPrometheus: () => void;
  onOpenFileLog: () => void;
};

export function CollectorRuntimeCoreForm(props: Props) {
  const { t } = useTranslation();
  if (props.config) {
    return (
      <>
        {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
        <RuntimeConfigForm {...props} config={props.config} />
      </>
    );
  }
  if (props.loading) {
    return (
      <div data-testid="runtime-config-loading">
        <Skeleton active />
      </div>
    );
  }
  return <Empty description={t('collectors.runtime.loadFailed')} />;
}

function RuntimeConfigForm(props: Props & { config: ManagedRuntimeConfigView }) {
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
      <CollectorRuntimeSourceSummary
        config={props.config}
        onManagePrometheus={props.onOpenPrometheus}
        onManageFileLog={props.onOpenFileLog}
      />
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
