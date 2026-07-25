/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import { importMonitorConfig, MonitorImportError } from '../api/monitor-import-api';
import {
  userCanImportMonitors,
  validateMonitorImportFile,
  type MonitorImportDraft,
  type MonitorImportFailureKind,
  type MonitorImportInvalidKind,
  type MonitorImportState
} from '../model/monitor-import-model';

export function useMonitorImport(reread: () => Promise<unknown>, onImported: () => void = () => undefined) {
  const canImport = userCanImportMonitors(useSession().session?.roles ?? []);
  const [draft, setDraft] = useState<MonitorImportDraft | null>(null);
  const [invalid, setInvalid] = useState<MonitorImportInvalidKind | null>(null);
  const operation = useMonitorImportOperation(reread);

  const open = () => {
    if (!canImport || operation.isActive()) return;
    setDraft({ file: null });
    setInvalid(null);
    operation.clearFailure();
  };
  const cancel = () => {
    if (operation.isActive()) return;
    setDraft(null);
    setInvalid(null);
    operation.clearFailure();
  };
  const selectFile = (file: File | null) => {
    if (operation.isActive()) return;
    setDraft(current => (current ? { file } : current));
    setInvalid(null);
    operation.clearFailure();
  };
  const submit = async () => {
    if (!canImport || !draft || operation.isActive()) return false;
    const validation = validateMonitorImportFile(draft.file);
    if (!validation.valid) {
      setInvalid(validation.reason);
      return false;
    }
    return operation.execute(validation.file, () => {
      onImported();
      setDraft(null);
    });
  };

  const state: MonitorImportState = {
    canImport,
    draft,
    invalid,
    failure: operation.failure,
    busy: operation.busy
  };
  return { state, actions: { open, cancel, selectFile, submit } };
}

function useMonitorImportOperation(reread: () => Promise<unknown>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [failure, setFailure] = useState<MonitorImportFailureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);

  const execute = async (file: File, accept: () => void) => {
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailure(null);
    try {
      await importMonitorConfig(file, controller.signal);
      if (!mounted.current) return true;
      accept();
      void message.success(t('monitor.import.success'));
      try {
        await reread();
      } catch {
        if (mounted.current) void message.warning(t('monitor.import.refreshFailure'));
      }
      return true;
    } catch (error) {
      if (mounted.current) {
        setFailure(error instanceof MonitorImportError ? error.kind : 'error');
      }
      return false;
    } finally {
      if (active.current === controller) active.current = null;
      if (mounted.current) setBusy(false);
    }
  };

  return {
    busy,
    failure,
    isActive: () => active.current !== null,
    clearFailure: () => setFailure(null),
    execute
  };
}
