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
  managedFileLogLimits,
  type ManagedFileLogSourceDraft,
  type ManagedFileLogSourceSelection,
  type ManagedFileLogSourceView
} from '../model/collector-file-log-source-model';
import { CollectorFileLogSourceForm } from './collector-file-log-source-form';
import styles from './collector-runtime-sources-view.module.css';

type Props = {
  view: ManagedFileLogSourceView;
  prometheusTargetCount: number;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  onSelect: (selection: ManagedFileLogSourceSelection) => void;
  onApply: (source: ManagedFileLogSourceDraft) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onCancelSource: () => void;
};

export function CollectorFileLogSourcesView(props: Props) {
  const { t } = useTranslation();
  const selected = selectedSource(props.view);
  return (
    <Space className={styles.view ?? ''} direction="vertical" size="middle">
      {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
      <Alert
        type="info"
        showIcon
        message={t('collectors.runtime.fileLog.referenceOnly')}
        description={t('collectors.runtime.fileLog.prometheusUnchanged', { count: props.prometheusTargetCount })}
      />
      {props.view.selection === null ? (
        <FileLogSourceList {...props} />
      ) : (
        <CollectorFileLogSourceForm
          source={selected}
          disabled={props.saving}
          onApply={props.onApply}
          onCancel={props.onCancelSource}
        />
      )}
    </Space>
  );
}

function FileLogSourceList(props: Props) {
  const { t } = useTranslation();
  return (
    <>
      <List
        className={styles.list ?? ''}
        dataSource={[...props.view.sources]}
        locale={{ emptyText: <Empty description={t('collectors.runtime.fileLog.empty')} /> }}
        renderItem={(source, index) => (
          <List.Item actions={sourceActions(source, index, props)}>
            <List.Item.Meta
              title={source.name}
              description={<Typography.Text className={styles.endpoint ?? ''}>{source.pathProfile}</Typography.Text>}
            />
          </List.Item>
        )}
      />
      <Space wrap>
        <Button
          disabled={props.saving || props.view.sources.length >= managedFileLogLimits.sources}
          onClick={() => props.onSelect('new')}
        >
          {t('collectors.runtime.fileLog.add')}
        </Button>
        <Button type="primary" loading={props.saving} onClick={props.onSave}>
          {t('collectors.runtime.fileLog.save')}
        </Button>
        <Button disabled={props.saving} onClick={props.onCancel}>
          {t('collectors.runtime.fileLog.back')}
        </Button>
      </Space>
    </>
  );
}

function sourceActions(source: ManagedFileLogSourceDraft, index: number, props: Props) {
  return [
    <Button key="edit" type="link" disabled={props.saving} onClick={() => props.onSelect(index)}>
      <SourceAction action="editNamed" name={source.name} />
    </Button>,
    <Button key="remove" type="link" danger disabled={props.saving} onClick={() => props.onRemove(index)}>
      <SourceAction action="removeNamed" name={source.name} />
    </Button>
  ];
}

function SourceAction({ action, name }: { action: 'editNamed' | 'removeNamed'; name: string }) {
  const { t } = useTranslation();
  return t(`collectors.runtime.fileLog.${action}`, { name });
}

function selectedSource(view: ManagedFileLogSourceView) {
  return typeof view.selection === 'number' ? (view.sources[view.selection] ?? null) : null;
}
