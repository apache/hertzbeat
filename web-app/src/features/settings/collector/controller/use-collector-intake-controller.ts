/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  parseCollectorIntakeAdvertisementRequest,
  type CollectorInstrumentationIntake,
  type CollectorIntakeAdvertisementRequest
} from '@/shared/collector';

import {
  clearCollectorInstrumentationIntake,
  loadCollectorManagementPage,
  saveCollectorInstrumentationIntake
} from '../api/collector-management-api';
import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';
import { sameCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import { classifyCollectorMutationFailure } from './collector-mutation';
import { collectorQueryKeys } from './collector-query-keys';

type Editor = { record: CollectorRecord; query: CollectorQuery };
type Options = {
  query: CollectorQuery;
  queryRef: { current: CollectorQuery };
  records: CollectorRecord[];
  queryClient: QueryClient;
  locked: boolean;
};

export function useCollectorIntakeController(options: Options) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<CollectorMutationFailure | null>(null);
  const open = useCallback(
    (name: string) => {
      if (options.locked || saving) return;
      const record = options.records.find(candidate => candidate.name === name);
      if (!record) return;
      setFailure(null);
      setEditor({ record, query: options.query });
    },
    [options.locked, options.query, options.records, saving]
  );
  const execute = useCallback(
    async (request?: CollectorIntakeAdvertisementRequest) => {
      if (!editor || saving) return;
      if (!sameCollectorQuery(editor.query, options.queryRef.current)) return setEditor(null);
      setSaving(true);
      setFailure(null);
      await options.queryClient.cancelQueries({ queryKey: collectorQueryKeys.page(editor.query), exact: true });
      const result = await persistAndProveIntake(editor, request, options.queryClient);
      const current = sameCollectorQuery(editor.query, options.queryRef.current);
      setSaving(false);
      if (!current) return setEditor(null);
      if (result) return setFailure(result);
      setEditor(null);
      void message.success(t('collectors.intake.success'));
    },
    [editor, message, options.queryClient, options.queryRef, saving, t]
  );
  const save = useCallback(
    async (value: unknown) => {
      const request = parseCollectorIntakeAdvertisementRequest(value);
      if (!request) return setFailure('validation');
      await execute(request);
    },
    [execute]
  );
  return {
    editor,
    saving,
    failure,
    open,
    save,
    clear: () => execute(),
    cancel: () => {
      if (!saving) {
        setEditor(null);
        setFailure(null);
      }
    }
  };
}

async function persistAndProveIntake(
  editor: Editor,
  request: CollectorIntakeAdvertisementRequest | undefined,
  queryClient: QueryClient
): Promise<CollectorMutationFailure | null> {
  try {
    const response = request
      ? await saveCollectorInstrumentationIntake(editor.record.name, request)
      : await clearCollectorInstrumentationIntake(editor.record.name);
    const page = await loadCollectorManagementPage(editor.query);
    queryClient.setQueryData(collectorQueryKeys.page(editor.query), page);
    const proof = page.content.find(record => record.name === editor.record.name)?.instrumentationIntake;
    return proof && sameIntake(proof, response) ? null : 'validation';
  } catch (error) {
    return classifyCollectorMutationFailure(error);
  }
}

function sameIntake(left: CollectorInstrumentationIntake, right: CollectorInstrumentationIntake) {
  if (left.status !== right.status) return false;
  if (left.status === 'unavailable' || right.status === 'unavailable') {
    return left.status === 'unavailable' && right.status === 'unavailable' && left.errorCode === right.errorCode;
  }
  return (
    left.collectorId === right.collectorId &&
    left.gateway === right.gateway &&
    left.otlpHttpEndpoint === right.otlpHttpEndpoint &&
    left.otlpGrpcEndpoint === right.otlpGrpcEndpoint &&
    left.capabilities.length === right.capabilities.length &&
    left.capabilities.every(capability => right.capabilities.includes(capability))
  );
}
