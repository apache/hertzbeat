/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Checkbox, Empty, Modal, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { Monitor } from '@/features/monitor';

import styles from '../shared/alert-rule-editor.module.css';

type MetricBindingEvidence =
  | { kind: 'idle' | 'loading' | 'empty' }
  | { kind: 'unavailable' | 'contract-error' | 'error' }
  | { kind: 'ready'; monitors: Monitor[]; labels: string[] };

export type MetricBindingViewState = {
  eligible: boolean;
  open: boolean;
  evidence: MetricBindingEvidence;
  selectedMonitorIds: number[];
  selectedLabels: string[];
  labelChoices: string[];
};

type MetricBindingFieldProps = {
  busy: boolean;
  state: MetricBindingViewState;
  open: () => void;
  cancel: () => void;
  confirm: () => void;
  retry: () => unknown;
  changeMonitorIds: (ids: number[]) => void;
  changeLabels: (labels: string[]) => void;
};

export function AlertRuleMetricBindingField(props: MetricBindingFieldProps) {
  const { t } = useTranslation();
  if (!props.state.eligible) return null;
  const confirmable = props.state.evidence.kind === 'ready' || props.state.evidence.kind === 'empty';
  return (
    <section className={`${styles.wide} ${styles.bindingField}`}>
      <div>
        <Typography.Text>{t('alertRules.metricBindings.title')}</Typography.Text>
        <Typography.Text type="secondary">{t('alertRules.metricBindings.description')}</Typography.Text>
      </div>
      <Button disabled={props.busy} onClick={props.open}>
        {t('alertRules.metricBindings.manage')}
      </Button>
      <Modal
        destroyOnHidden
        maskClosable={false}
        open={props.state.open}
        title={t('alertRules.metricBindings.title')}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        okButtonProps={{ disabled: props.busy || !confirmable }}
        onCancel={props.cancel}
        onOk={props.confirm}
      >
        <BindingDialogBody {...props} />
      </Modal>
    </section>
  );
}

function BindingDialogBody(props: MetricBindingFieldProps) {
  const { t } = useTranslation();
  const { evidence } = props.state;
  if (evidence.kind === 'idle') return null;
  if (evidence.kind === 'loading') {
    return (
      <div className={styles.bindingEvidence}>
        <Spin size="small" />
        <Typography.Text>{t('alertRules.metricBindings.loading')}</Typography.Text>
      </div>
    );
  }
  if (evidence.kind === 'empty') {
    return (
      <div className={styles.bindingDialog}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('alertRules.metricBindings.empty')} />
        <BindingLabels {...props} />
      </div>
    );
  }
  if (evidence.kind !== 'ready') {
    return <BindingFailureEvidence kind={evidence.kind} retry={props.retry} />;
  }
  return (
    <div className={styles.bindingDialog}>
      <fieldset>
        <legend>{t('alertRules.metricBindings.instances')}</legend>
        <Checkbox.Group
          className={styles.bindingInstances}
          value={props.state.selectedMonitorIds}
          onChange={values => props.changeMonitorIds(values.map(Number))}
        >
          {evidence.monitors.map(monitor => (
            <Checkbox key={monitor.id} value={monitor.id} aria-label={`${monitor.name} ${monitor.instance}`}>
              <span>{monitor.name}</span>
              <Typography.Text type="secondary">{monitor.instance}</Typography.Text>
            </Checkbox>
          ))}
        </Checkbox.Group>
      </fieldset>
      <BindingLabels {...props} />
    </div>
  );
}

function BindingLabels(props: MetricBindingFieldProps) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend>{t('alertRules.metricBindings.labels')}</legend>
      {props.state.labelChoices.length ? (
        <Checkbox.Group
          className={styles.bindingLabels}
          value={props.state.selectedLabels}
          options={props.state.labelChoices}
          onChange={values => props.changeLabels(values.map(String))}
        />
      ) : (
        <Typography.Text type="secondary">{t('alertRules.metricBindings.noLabels')}</Typography.Text>
      )}
    </fieldset>
  );
}

function BindingFailureEvidence({
  kind,
  retry
}: {
  kind: 'unavailable' | 'contract-error' | 'error';
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Alert
      showIcon
      type="error"
      message={t(`alertRules.metricBindings.${failureKey(kind)}`)}
      action={
        <Button size="small" onClick={retry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function failureKey(kind: 'unavailable' | 'contract-error' | 'error') {
  return kind === 'contract-error' ? 'contractError' : kind;
}
