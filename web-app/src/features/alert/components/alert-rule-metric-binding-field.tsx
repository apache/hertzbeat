/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CloseOutlined, LeftOutlined, LinkOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Empty, Input, Modal, Select, Spin, Tag, Typography } from 'antd';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Monitor } from '@/features/monitor';

import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleFieldLabel } from './alert-rule-field-label';

const bindingFieldClassName = `${styles.wide ?? ''} ${styles.bindingField ?? ''}`;
type MetricBindingEvidence =
  | { kind: 'idle' | 'loading' | 'empty' }
  | { kind: 'unavailable' | 'contract-error' | 'error' }
  | { kind: 'ready'; monitors: Monitor[] };

export type MetricBindingViewState = {
  eligible: boolean;
  open: boolean;
  evidence: MetricBindingEvidence;
  selectedMonitorIds: number[];
  selectedLabels: string[];
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
  const confirmable = props.state.evidence.kind === 'ready' || props.state.evidence.kind === 'empty';
  return (
    <section className={bindingFieldClassName}>
      <AlertRuleFieldLabel
        className={styles.bindingLabel}
        help={t('alertRules.help.bindings')}
        label={t('alertRules.metricBindings.title')}
      />
      <Button
        aria-label={t('alertRules.metricBindings.manage')}
        className={styles.bindingManageButton ?? ''}
        icon={<LinkOutlined aria-hidden="true" />}
        disabled={props.busy || !props.state.eligible}
        onClick={props.open}
      >
        {t('alertRules.metricBindings.manage')}
      </Button>
      <Modal
        destroyOnHidden
        maskClosable={false}
        open={props.state.eligible && props.state.open}
        title={t('alertRules.metricBindings.dialogTitle')}
        width="60%"
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
  if (evidence.kind !== 'ready') {
    if (evidence.kind !== 'empty') return <BindingFailureEvidence kind={evidence.kind} retry={props.retry} />;
  }
  const monitors = evidence.kind === 'ready' ? evidence.monitors : [];
  return <BindingWorkspace {...props} monitors={monitors} />;
}

type TransferDirection = 'left' | 'right';
type TransferFilters = Record<TransferDirection, { name: string; labels: string[] }>;
type TransferSelections = Record<TransferDirection, number[]>;

const initialFilters: TransferFilters = {
  left: { name: '', labels: [] },
  right: { name: '', labels: [] }
};

const initialSelections: TransferSelections = { left: [], right: [] };

function BindingWorkspace(props: MetricBindingFieldProps & { monitors: Monitor[] }) {
  const { t } = useTranslation();
  const instancesHeadingId = useId();
  const [filters, setFilters] = useState<TransferFilters>(initialFilters);
  const [selections, setSelections] = useState<TransferSelections>(initialSelections);
  const associatedIds = new Set(props.state.selectedMonitorIds);
  const monitors = {
    left: props.monitors.filter(monitor => !associatedIds.has(monitor.id)),
    right: props.monitors.filter(monitor => associatedIds.has(monitor.id))
  };
  const visible = {
    left: filteredMonitors(monitors.left, filters.left),
    right: filteredMonitors(monitors.right, filters.right)
  };
  return (
    <div className={styles.bindingDialog}>
      <section className={styles.bindingCard} aria-labelledby={instancesHeadingId}>
        <h3 id={instancesHeadingId}>{t('alertRules.metricBindings.instances')}</h3>
        <div className={styles.bindingTransfer}>
          <BindingTransferPane
            direction="left"
            filters={filters.left}
            monitors={visible.left}
            allMonitors={monitors.left}
            selectedIds={selections.left}
            changeFilters={next => setFilters(current => ({ ...current, left: next }))}
            changeSelectedIds={next => setSelections(current => ({ ...current, left: next }))}
          />
          <div className={styles.bindingTransferActions}>
            <Button
              aria-label={t('alertRules.metricBindings.moveLeft')}
              disabled={props.busy || selections.right.length === 0}
              icon={<LeftOutlined aria-hidden="true" />}
              size="small"
              onClick={() => {
                const removed = new Set(selections.right);
                props.changeMonitorIds(props.state.selectedMonitorIds.filter(id => !removed.has(id)));
                setSelections(initialSelections);
              }}
            />
            <Button
              aria-label={t('alertRules.metricBindings.moveRight')}
              disabled={props.busy || selections.left.length === 0}
              icon={<RightOutlined aria-hidden="true" />}
              size="small"
              onClick={() => {
                const added = new Set(selections.left);
                props.changeMonitorIds(
                  props.monitors
                    .filter(monitor => associatedIds.has(monitor.id) || added.has(monitor.id))
                    .map(monitor => monitor.id)
                );
                setSelections(initialSelections);
              }}
            />
          </div>
          <BindingTransferPane
            direction="right"
            filters={filters.right}
            monitors={visible.right}
            allMonitors={monitors.right}
            selectedIds={selections.right}
            changeFilters={next => setFilters(current => ({ ...current, right: next }))}
            changeSelectedIds={next => setSelections(current => ({ ...current, right: next }))}
          />
        </div>
      </section>
      <BindingLabels {...props} monitors={props.monitors} />
    </div>
  );
}

function BindingTransferPane(props: {
  direction: TransferDirection;
  filters: TransferFilters[TransferDirection];
  monitors: Monitor[];
  allMonitors: Monitor[];
  selectedIds: number[];
  changeFilters: (filters: TransferFilters[TransferDirection]) => void;
  changeSelectedIds: (ids: number[]) => void;
}) {
  const { t } = useTranslation();
  const sideKey = props.direction === 'left' ? 'unassociated' : 'associated';
  const visibleIds = props.monitors.map(monitor => monitor.id);
  const visibleSelected = visibleIds.filter(id => props.selectedIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleSelected.length === visibleIds.length;
  return (
    <section
      className={styles.bindingTransferPane}
      role="region"
      aria-label={t(`alertRules.metricBindings.${sideKey}`)}
    >
      <div className={styles.bindingTransferCount}>
        {t('alertRules.metricBindings.count', { count: props.allMonitors.length })}
      </div>
      <div className={styles.bindingTransferFilters}>
        <Input
          allowClear
          placeholder={t('alertRules.metricBindings.filterName')}
          value={props.filters.name}
          onChange={event => props.changeFilters({ ...props.filters, name: event.target.value })}
        />
        <Select
          allowClear
          aria-label={t('alertRules.metricBindings.filterLabels')}
          mode="tags"
          options={monitorLabelOptions(props.allMonitors)}
          placeholder={t('alertRules.metricBindings.filterLabels')}
          tokenSeparators={[',']}
          value={props.filters.labels}
          onChange={labels => props.changeFilters({ ...props.filters, labels })}
        />
      </div>
      <div className={styles.bindingTransferHeading}>
        <Checkbox
          aria-label={t(`alertRules.metricBindings.selectAll.${sideKey}`)}
          checked={allVisibleSelected}
          indeterminate={visibleSelected.length > 0 && !allVisibleSelected}
          onChange={event => {
            const retained = props.selectedIds.filter(id => !visibleIds.includes(id));
            props.changeSelectedIds(event.target.checked ? [...retained, ...visibleIds] : retained);
          }}
        />
        <strong>{t(`alertRules.metricBindings.${sideKey}`)}</strong>
      </div>
      <div className={styles.bindingTransferList}>
        {props.monitors.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('alertRules.metricBindings.noData')} />
        ) : (
          props.monitors.map(monitor => (
            <label className={styles.bindingTransferRow} key={monitor.id}>
              <Checkbox
                aria-label={`${monitor.name} ${monitor.instance}`}
                checked={props.selectedIds.includes(monitor.id)}
                onChange={event =>
                  props.changeSelectedIds(toggleValue(props.selectedIds, monitor.id, event.target.checked))
                }
              />
              <span>{monitor.name}</span>
            </label>
          ))
        )}
      </div>
    </section>
  );
}

function BindingLabels(props: MetricBindingFieldProps & { monitors: Monitor[] }) {
  const { t } = useTranslation();
  const labelsHeadingId = useId();
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const selected = new Set(props.state.selectedLabels);
  const matchingMonitors = props.monitors.filter(monitor => monitorLabels(monitor).some(label => selected.has(label)));
  const confirmInput = () => {
    const label = inputValue.trim();
    if (label && !selected.has(label)) props.changeLabels([...props.state.selectedLabels, label]);
    setInputValue('');
    setInputVisible(false);
  };
  return (
    <section className={styles.bindingCard} aria-labelledby={labelsHeadingId}>
      <h3 id={labelsHeadingId}>{t('alertRules.metricBindings.labels')}</h3>
      <div className={styles.bindingLabelInput}>
        {props.state.selectedLabels.map(label => (
          <Tag color="geekblue" key={label}>
            <span>{label}</span>
            <Button
              aria-label={`${t('alertRules.metricBindings.removeLabel')}: ${label}`}
              className={styles.bindingLabelRemove ?? ''}
              disabled={props.busy}
              icon={<CloseOutlined aria-hidden="true" />}
              size="small"
              type="text"
              onClick={() => props.changeLabels(props.state.selectedLabels.filter(value => value !== label))}
            />
          </Tag>
        ))}
        {inputVisible ? (
          <Input
            autoFocus
            aria-label={t('alertRules.metricBindings.addLabel')}
            className={styles.bindingLabelInputControl}
            disabled={props.busy}
            size="small"
            value={inputValue}
            onBlur={confirmInput}
            onChange={event => setInputValue(event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              confirmInput();
            }}
          />
        ) : (
          <Button
            aria-label={t('alertRules.metricBindings.addLabel')}
            disabled={props.busy}
            icon={<PlusOutlined aria-hidden="true" />}
            size="small"
            onClick={() => setInputVisible(true)}
          >
            {t('alertRules.metricBindings.addLabel')}
          </Button>
        )}
      </div>
      {matchingMonitors.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('alertRules.metricBindings.labelEmpty')} />
      ) : (
        <div className={styles.bindingLabelMatches}>
          {matchingMonitors.map(monitor => (
            <div className={styles.bindingLabelMatch} key={monitor.id}>
              <span>{monitor.name}</span>
              <span>
                {monitorLabels(monitor).map(label => (
                  <Tag key={label}>{label}</Tag>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function filteredMonitors(monitors: Monitor[], filters: TransferFilters[TransferDirection]) {
  const name = filters.name.trim().toLocaleLowerCase();
  return monitors.filter(monitor => {
    const matchesName = !name || monitor.name.toLocaleLowerCase().includes(name);
    const labels = monitorLabels(monitor);
    const matchesLabels = filters.labels.length === 0 || filters.labels.some(label => labels.includes(label));
    return matchesName && matchesLabels;
  });
}

function monitorLabels(monitor: Monitor) {
  return Object.entries(monitor.labels ?? {}).map(([name, value]) => `${name}:${value}`);
}

function monitorLabelOptions(monitors: Monitor[]) {
  return [...new Set(monitors.flatMap(monitorLabels))]
    .sort((left, right) => left.localeCompare(right))
    .map(value => ({ value, label: value }));
}

function toggleValue(values: number[], value: number, selected: boolean) {
  if (selected) return values.includes(value) ? values : [...values, value];
  return values.filter(candidate => candidate !== value);
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
