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
import type { AlertRuleImportFailure } from '../model/alert-rule-import-model';

export function useAlertRuleImportOperation(reread: () => Promise<unknown>) {
  const context = useAlertRuleImportCommandContext(reread);
  return {
    busy: context.busy,
    failure: context.failure,
    inspectionRequired: context.failure?.outcome === 'uncertain',
    clearRejectedFailure: () => {
      if (context.failure?.outcome !== 'uncertain') context.setFailure(null);
    },
    execute: (file: File) => executeAlertRuleImport(file, context),
    inspect: () => inspectAlertRuleImport(context)
  };
}

function useAlertRuleImportCommandContext(reread: () => Promise<unknown>) {
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
  return { active, busy, failure, message, mounted, reread, request, setBusy, setFailure, t };
}

type AlertRuleImportCommandContext = ReturnType<typeof useAlertRuleImportCommandContext>;

async function executeAlertRuleImport(file: File, context: AlertRuleImportCommandContext) {
  if (context.active.current) return false;
  const controller = new AbortController();
  context.active.current = true;
  context.request.current = controller;
  context.setBusy(true);
  context.setFailure(null);
  try {
    await importAlertRuleDefinitions(file, controller.signal);
    if (!context.mounted.current) return false;
    try {
      await context.reread();
    } catch {
      if (context.mounted.current) void context.message.warning(context.t('alertRules.import.refreshFailure'));
    }
    return true;
  } catch (error) {
    if (context.mounted.current) context.setFailure(importFailure(error));
    return false;
  } finally {
    if (context.request.current === controller) {
      context.active.current = false;
      context.request.current = null;
    }
    if (context.mounted.current) context.setBusy(false);
  }
}

async function inspectAlertRuleImport(context: AlertRuleImportCommandContext) {
  if (context.active.current || context.failure?.outcome !== 'uncertain') return false;
  context.active.current = true;
  context.setBusy(true);
  try {
    await context.reread();
    if (!context.mounted.current) return false;
    context.setFailure(null);
    return true;
  } catch {
    if (context.mounted.current) void context.message.warning(context.t('alertRules.import.refreshFailure'));
    return false;
  } finally {
    context.active.current = false;
    if (context.mounted.current) context.setBusy(false);
  }
}

function importFailure(error: unknown): AlertRuleImportFailure {
  if (error instanceof AlertRuleImportError) return { kind: error.kind, outcome: error.outcome };
  return { kind: 'error', outcome: 'uncertain' };
}
