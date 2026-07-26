/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlertRuleImportError, importAlertRuleDefinitions } from '../api/alert-rule-import-api';
import {
  validateAlertRuleImportFile,
  type AlertRuleImportFailure,
  type AlertRuleImportInvalidKind,
  type AlertRuleImportState
} from '../model/alert-rule-import-model';

export function useAlertRuleImport(reread: () => Promise<unknown>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AlertRuleImportState['draft']>(null);
  const [invalid, setInvalid] = useState<AlertRuleImportInvalidKind | null>(null);
  const operation = useAlertRuleImportOperation(reread);

  const open = () => {
    if (operation.busy || draft) return;
    setDraft({ file: null });
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const cancel = () => {
    if (operation.busy) return;
    setDraft(null);
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const selectFile = (file: File | null) => {
    if (operation.busy || operation.inspectionRequired) return;
    setDraft(current => (current ? { file } : current));
    setInvalid(null);
    operation.clearRejectedFailure();
  };
  const submit = async () => {
    if (!draft || operation.busy || operation.inspectionRequired) return false;
    const validation = validateAlertRuleImportFile(draft.file);
    if (!validation.valid) {
      setInvalid(validation.reason);
      return false;
    }
    const imported = await operation.execute(validation.file);
    if (imported) {
      setDraft(null);
      setInvalid(null);
      void message.success(t('alertRules.import.success'));
    }
    return imported;
  };
  const inspect = async () => {
    const inspected = await operation.inspect();
    if (inspected) {
      // Close the modal so the operator actually sees the refreshed list
      // before choosing whether a second import is safe.
      setDraft(null);
      setInvalid(null);
    }
    return inspected;
  };

  return {
    state: {
      draft,
      invalid,
      failure: operation.failure,
      busy: operation.busy,
      inspectionRequired: operation.inspectionRequired
    } satisfies AlertRuleImportState,
    actions: { open, cancel, selectFile, submit, inspect }
  };
}

function useAlertRuleImportOperation(reread: () => Promise<unknown>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [failure, setFailure] = useState<AlertRuleImportFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  const execute = async (file: File) => {
    if (active.current) return false;
    const controller = new AbortController();
    active.current = true;
    request.current = controller;
    setBusy(true);
    setFailure(null);
    try {
      await importAlertRuleDefinitions(file, controller.signal);
      if (!mounted.current) return false;
      try {
        await reread();
      } catch {
        if (mounted.current) void message.warning(t('alertRules.import.refreshFailure'));
      }
      return true;
    } catch (error) {
      if (mounted.current) setFailure(importFailure(error));
      return false;
    } finally {
      if (request.current === controller) {
        active.current = false;
        request.current = null;
      }
      if (mounted.current) setBusy(false);
    }
  };

  const inspect = async () => {
    if (active.current || failure?.outcome !== 'uncertain') return false;
    active.current = true;
    setBusy(true);
    try {
      await reread();
      if (!mounted.current) return false;
      setFailure(null);
      return true;
    } catch {
      if (mounted.current) void message.warning(t('alertRules.import.refreshFailure'));
      return false;
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return {
    busy,
    failure,
    inspectionRequired: failure?.outcome === 'uncertain',
    clearRejectedFailure: () => {
      if (failure?.outcome !== 'uncertain') setFailure(null);
    },
    execute,
    inspect
  };
}

function importFailure(error: unknown): AlertRuleImportFailure {
  if (error instanceof AlertRuleImportError) return { kind: error.kind, outcome: error.outcome };
  return { kind: 'error', outcome: 'uncertain' };
}
