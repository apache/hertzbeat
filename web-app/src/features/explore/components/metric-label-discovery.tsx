/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Select, type GetRef } from 'antd';
import { useRef, useState } from 'react';
import styles from './explore-metric-plan-editor.module.css';
import { useTranslation } from 'react-i18next';
import { addMetricMatcher, readMetricMatchers } from '../model/metric-label-matchers';
import { MetricMatcherRows } from './metric-matcher-rows';
import type { MetricLabelSuggestions } from '../model/explore-metric-inventory';
export type MetricDiscoveryProps = {
  labelKeys?: MetricLabelSuggestions | undefined;
  selectedLabel?: string | undefined;
  onSelectedLabelChange?: ((label: string) => void) | undefined;
  labelValues?: MetricLabelSuggestions | undefined;
  lockedLabels?: readonly string[] | undefined;
  discoveryIdentity?: string | undefined;
};
export function MetricLabelDiscovery({
  labelKeys,
  selectedLabel,
  onSelectedLabelChange,
  labelValues,
  lockedLabels = [],
  discoveryIdentity,
  filter,
  onFilter
}: MetricDiscoveryProps & { filter: string; onFilter: (value: string) => void }) {
  const { t } = useTranslation();
  const valueInput = useRef<GetRef<typeof Select>>(null);
  const owner = JSON.stringify([discoveryIdentity, selectedLabel]);
  const [selection, setSelection] = useState({ owner, value: undefined as string | undefined });
  if (selection.owner !== owner) setSelection({ owner, value: undefined });
  const value = selection.owner === owner ? selection.value : undefined;
  if (!labelKeys) return null;
  const candidateReady = candidateIsReady(labelKeys, selectedLabel, value, labelValues);
  const inserted = candidateReady
    ? addMetricMatcher(filter, { field: selectedLabel!, operator: '=', value: value! }, lockedLabels)
    : undefined;
  return (
    <div className={styles.discovery}>
      <Select
        aria-label={t('explore.metricComposition.labelKey')}
        placeholder={t('explore.metricComposition.labelKey')}
        value={selectedLabel || null}
        options={labelKeys.items.map(item => ({ value: item, label: item }))}
        onChange={label => onSelectedLabelChange?.(label)}
        loading={labelKeys.state === 'loading'}
      />
      <Select
        ref={valueInput}
        aria-label={t('explore.metricComposition.labelValue')}
        placeholder={t('explore.metricComposition.labelValue')}
        value={value}
        options={labelValues?.items.map(item => ({ value: item, label: item })) ?? []}
        onChange={next => setSelection({ owner, value: next })}
        loading={labelValues?.state === 'loading'}
      />
      <AddMetricFilter inserted={inserted} onFilter={onFilter} onAdded={() => valueInput.current?.focus()} />
      <DiscoveryStatus labelKeys={labelKeys} labelValues={labelValues} />
      <MatcherStatus
        filter={filter}
        ready={candidateReady}
        inserted={inserted}
        selectedLabel={selectedLabel}
        lockedLabels={lockedLabels}
      />
      <MetricMatcherRows filter={filter} locked={lockedLabels} onFilter={onFilter} />
    </div>
  );
}

function MatcherStatus({
  filter,
  ready,
  inserted,
  selectedLabel,
  lockedLabels
}: {
  filter: string;
  ready: boolean;
  inserted: string | undefined;
  selectedLabel: string | undefined;
  lockedLabels: readonly string[];
}) {
  const matchers = readMetricMatchers(filter);
  const duplicate = matchers?.some(item => item.field === selectedLabel);
  const capacityBlocked = isCapacityBlocked(
    ready,
    inserted,
    matchers !== undefined,
    duplicate,
    lockedLabels.includes(selectedLabel ?? '')
  );
  const { t } = useTranslation();
  return (
    <>
      {duplicate && <p role="status">{t('explore.metricComposition.matcherDuplicate')}</p>}
      {selectedLabel && lockedLabels.includes(selectedLabel) && (
        <p role="status">{t('explore.metricComposition.matcherLocked')}</p>
      )}
      {capacityBlocked && <p role="status">{t('explore.metricComposition.matcherLimit')}</p>}
    </>
  );
}

function isCapacityBlocked(
  ready: boolean,
  inserted: string | undefined,
  parsed: boolean,
  duplicate: boolean | undefined,
  locked: boolean
) {
  return ready && inserted === undefined && parsed && !duplicate && !locked;
}

function candidateIsReady(
  keys: MetricLabelSuggestions,
  label: string | undefined,
  value: string | undefined,
  values: MetricLabelSuggestions | undefined
) {
  return keys.state === 'ready' && keys.items.includes(label ?? '') && canInsertMatcher(label, value, values);
}

function canInsertMatcher(
  selectedLabel: string | undefined,
  value: string | undefined,
  labelValues: MetricLabelSuggestions | undefined
) {
  return Boolean(
    selectedLabel &&
    /^[A-Za-z_][A-Za-z0-9_]*$/u.test(selectedLabel) &&
    value !== undefined &&
    labelValues?.state === 'ready' &&
    labelValues.items.includes(value)
  );
}

function DiscoveryStatus({
  labelKeys,
  labelValues
}: {
  labelKeys: MetricLabelSuggestions;
  labelValues: MetricLabelSuggestions | undefined;
}) {
  const { t } = useTranslation();
  return (
    <p>
      {t(`explore.metricComposition.discovery.${labelKeys.state}`)}
      {labelValues &&
        ` · ${t(labelValues.state === 'idle' ? 'explore.metricComposition.chooseLabel' : `explore.metricComposition.discovery.${labelValues.state}`)}`}
      {(labelKeys.truncated || labelValues?.truncated) && ` · ${t('explore.metricComposition.discovery.truncated')}`}
    </p>
  );
}

function AddMetricFilter({
  inserted,
  onFilter,
  onAdded
}: {
  inserted: string | undefined;
  onFilter: (value: string) => void;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      disabled={inserted === undefined}
      onClick={() => {
        if (inserted !== undefined) {
          onFilter(inserted);
          onAdded();
        }
      }}
    >
      {t('explore.metricComposition.addMatcher')}
    </Button>
  );
}
