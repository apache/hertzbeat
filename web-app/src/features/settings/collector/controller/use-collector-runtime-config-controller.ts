/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildManagedOtelRuntimeConfigUpdate,
  type ManagedOtelRuntimeConfig
} from '../api/collector-runtime-config-schema';
import { managedRuntimeDurationSeconds } from '../api/collector-runtime-duration';
import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import { sameCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import type { ManagedRuntimeConfigView } from '../model/collector-runtime-config-model';
import { persistCollectorRuntimeConfig, readCollectorRuntimeConfig } from './collector-runtime-config-persistence';

type RuntimeEditor = {
  record: CollectorRecord;
  query: CollectorQuery;
  current: ManagedOtelRuntimeConfig | null;
  config: ManagedRuntimeConfigView | null;
};
type Receipt = { record: CollectorRecord; query: CollectorQuery; operation: number };
type RuntimePhase = 'idle' | 'loading' | 'saving';
type Options = {
  query: CollectorQuery;
  queryRef: { current: CollectorQuery };
  records: CollectorRecord[];
  locked: boolean;
};
type RuntimeControls = {
  operationRef: { current: number };
  receiptRef: { current: Receipt | null };
  editor: RuntimeEditor | null;
  phase: RuntimePhase;
  setEditor: Dispatch<SetStateAction<RuntimeEditor | null>>;
  setPhase: Dispatch<SetStateAction<RuntimePhase>>;
  setFailure: Dispatch<SetStateAction<CollectorMutationFailure | null>>;
};

export function useCollectorRuntimeConfigController(options: Options) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const operationRef = useRef(0);
  const receiptRef = useRef<Receipt | null>(null);
  const [editor, setEditor] = useState<RuntimeEditor | null>(null);
  const [phase, setPhase] = useState<RuntimePhase>('idle');
  const [failure, setFailure] = useState<CollectorMutationFailure | null>(null);
  const controls = { operationRef, receiptRef, editor, phase, setEditor, setPhase, setFailure };
  const open = (name: string) => openRuntimeConfig(name, options, controls);
  const save = (value: unknown) =>
    saveRuntimeConfig(value, options, controls, () => void message.success(t('collectors.runtime.success')));
  const cancel = () => cancelRuntimeConfig(controls);
  const busy = phase !== 'idle';
  return { editor, busy, loading: phase === 'loading', saving: phase === 'saving', failure, open, save, cancel };
}

async function openRuntimeConfig(name: string, options: Options, controls: RuntimeControls) {
  if (options.locked || controls.phase !== 'idle') return;
  const record = options.records.find(candidate => candidate.name === name);
  if (!record) return;
  const receipt = { record, query: options.query, operation: ++controls.operationRef.current };
  controls.receiptRef.current = receipt;
  controls.setEditor({ record, query: receipt.query, current: null, config: null });
  controls.setFailure(null);
  controls.setPhase('loading');
  const result = await readCollectorRuntimeConfig(record.name);
  const status = runtimeReceiptStatus(receipt, controls.operationRef.current, options.queryRef.current);
  if (status === 'superseded') return;
  if (status === 'stale-query') return closeRuntime(controls);
  controls.setPhase('idle');
  if (result.failure) return controls.setFailure(result.failure);
  controls.setEditor({
    record,
    query: receipt.query,
    current: result.config,
    config: runtimeConfigView(result.config)
  });
}

async function saveRuntimeConfig(
  value: unknown,
  options: Options,
  controls: RuntimeControls,
  notifySuccess: () => void
) {
  const receipt = controls.receiptRef.current;
  if (!receipt || !controls.editor?.current || controls.phase !== 'idle') return;
  if (!sameCollectorQuery(receipt.query, options.queryRef.current)) return closeRuntime(controls);
  const request = buildManagedOtelRuntimeConfigUpdate(controls.editor.current, value);
  if (!request) return controls.setFailure('validation');
  const activeReceipt = { ...receipt, operation: ++controls.operationRef.current };
  controls.receiptRef.current = activeReceipt;
  controls.setPhase('saving');
  controls.setFailure(null);
  const result = await persistCollectorRuntimeConfig(receipt.record.name, request);
  const status = runtimeReceiptStatus(activeReceipt, controls.operationRef.current, options.queryRef.current);
  if (status === 'superseded') return;
  if (status === 'stale-query') return closeRuntime(controls);
  controls.setPhase('idle');
  if (result) return controls.setFailure(result);
  controls.receiptRef.current = null;
  controls.setEditor(null);
  notifySuccess();
}

function cancelRuntimeConfig(controls: RuntimeControls) {
  if (controls.phase === 'saving') return;
  closeRuntime(controls);
  controls.setFailure(null);
}

function runtimeReceiptStatus(receipt: Receipt, operation: number, query: CollectorQuery) {
  // An older completion must be ignored; closing here would destroy the newer operation's editor.
  if (receipt.operation !== operation) return 'superseded';
  return sameCollectorQuery(receipt.query, query) ? 'current' : 'stale-query';
}

function closeRuntime(controls: RuntimeControls) {
  controls.operationRef.current += 1;
  controls.receiptRef.current = null;
  controls.setEditor(null);
  controls.setPhase('idle');
}

function runtimeConfigView(config: ManagedOtelRuntimeConfig): ManagedRuntimeConfigView {
  return {
    schemaVersion: config.schemaVersion,
    revision: config.revision,
    environment: config.environment,
    hostMetricsEnabled: config.hostMetricsEnabled,
    hostMetricsIntervalSeconds: managedRuntimeDurationSeconds(config.hostMetricsInterval),
    hostMetricsScrapers: [...config.hostMetricsScrapers],
    resourceDetectors: [...config.resourceDetectors],
    telemetryFilterPresets: [...config.telemetryFilterPresets],
    prometheusTargetCount: config.prometheusTargets.length,
    fileLogSourceCount: config.fileLogSources.length
  };
}
