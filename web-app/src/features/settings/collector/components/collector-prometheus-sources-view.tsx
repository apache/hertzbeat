/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, List, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationFailure } from '../model/collector-model';
import {
  managedPrometheusLimits,
  type ManagedPrometheusSourceView,
  type ManagedPrometheusTargetDraft,
  type ManagedPrometheusTargetSelection
} from '../model/collector-prometheus-source-model';
import { CollectorPrometheusTargetForm } from './collector-prometheus-target-form';
import styles from './collector-runtime-sources-view.module.css';

type Props = {
  view: ManagedPrometheusSourceView;
  fileLogSourceCount: number;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  onSelect: (selection: ManagedPrometheusTargetSelection) => void;
  onApply: (target: ManagedPrometheusTargetDraft) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onCancelTarget: () => void;
};

export function CollectorPrometheusSourcesView(props: Props) {
  const { t } = useTranslation();
  const selected = selectedTarget(props.view);
  if (props.view.selection !== null) {
    return (
      <Space className={styles.view ?? ''} direction="vertical" size="middle">
        {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
        <CollectorPrometheusTargetForm
          key={props.view.selection}
          target={selected}
          disabled={props.saving}
          onApply={props.onApply}
          onCancel={props.onCancelTarget}
        />
      </Space>
    );
  }
  return (
    <Space className={styles.view ?? ''} direction="vertical" size="middle">
      {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
      <Alert
        type="info"
        showIcon
        message={t('collectors.runtime.prometheus.referenceOnly')}
        description={t('collectors.runtime.prometheus.fileLogUnchanged', { count: props.fileLogSourceCount })}
      />
      <Button
        disabled={props.saving || props.view.targets.length >= managedPrometheusLimits.targets}
        onClick={() => props.onSelect('new')}
      >
        {t('collectors.runtime.prometheus.add')}
      </Button>
      <PrometheusTargetList {...props} />
      <Space>
        <Button type="primary" loading={props.saving} onClick={props.onSave}>
          {t('collectors.runtime.prometheus.save')}
        </Button>
        <Button disabled={props.saving} onClick={props.onCancel}>
          {t('collectors.runtime.prometheus.back')}
        </Button>
      </Space>
    </Space>
  );
}

function PrometheusTargetList(props: Props) {
  const { t } = useTranslation();
  if (props.view.targets.length === 0) {
    return <Empty description={t('collectors.runtime.prometheus.empty')} />;
  }
  return (
    <List
      className={styles.list ?? ''}
      dataSource={[...props.view.targets]}
      renderItem={(target, index) => (
        <List.Item actions={targetActions(target, index, props)}>
          <List.Item.Meta
            title={target.name}
            description={
              <Space className={styles.endpoint ?? ''} direction="vertical" size={0}>
                <Typography.Text>{target.endpoint}</Typography.Text>
                <Typography.Text type="secondary">
                  {t('collectors.runtime.prometheus.schedule', {
                    interval: target.intervalSeconds,
                    timeout: target.timeoutSeconds
                  })}
                </Typography.Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
}

function targetActions(target: ManagedPrometheusTargetDraft, index: number, props: Props) {
  return [
    <TargetAction key="edit" target={target} index={index} props={props} kind="edit" />,
    <TargetAction key="remove" target={target} index={index} props={props} kind="remove" />
  ];
}

function TargetAction({
  target,
  index,
  props,
  kind
}: {
  target: ManagedPrometheusTargetDraft;
  index: number;
  props: Props;
  kind: 'edit' | 'remove';
}) {
  const { t } = useTranslation();
  const remove = kind === 'remove';
  return (
    <Button
      danger={remove}
      disabled={props.saving}
      aria-label={t(`collectors.runtime.prometheus.${kind}Named`, { name: target.name })}
      onClick={() => (remove ? props.onRemove(index) : props.onSelect(index))}
    >
      {t(remove ? 'collectors.runtime.prometheus.remove' : 'common.edit')}
    </Button>
  );
}

function selectedTarget(view: ManagedPrometheusSourceView) {
  return typeof view.selection === 'number' ? (view.targets[view.selection] ?? null) : null;
}
