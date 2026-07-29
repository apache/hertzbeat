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
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { MonitorCapabilities } from '../model/monitor-capability-model';
import {
  validateMonitorImportFile,
  type MonitorImportDraft,
  type MonitorImportFailureKind,
  type MonitorImportInvalidKind,
  type MonitorImportState
} from '../model/monitor-import-model';
import { executeMonitorImport, type MonitorImportExecutionOwner as ImportOwner } from './monitor-import-execution';

type ImportRetirement = {
  currentCanImport: RefObject<boolean>;
  active: RefObject<ImportOwner | null>;
  generation: RefObject<number>;
  mounted: RefObject<boolean>;
  closeDraft: () => void;
  setBusy: (busy: boolean) => void;
  setFailure: (failure: MonitorImportFailureKind | null) => void;
};

export function useMonitorImport(
  reread: () => Promise<unknown>,
  capabilities: Pick<MonitorCapabilities, 'canWrite'>,
  onImported: () => void = () => undefined
) {
  const canImport = capabilities.canWrite;
  const [draft, setDraft] = useState<MonitorImportDraft | null>(null);
  const [invalid, setInvalid] = useState<MonitorImportInvalidKind | null>(null);
  const currentDraft = useRef(draft);
  const closeDraft = useCallback(() => {
    currentDraft.current = null;
    setDraft(null);
    setInvalid(null);
  }, []);
  const operation = useMonitorImportOperation(canImport, reread, onImported, closeDraft);

  const open = () => {
    if (!operation.canStart()) return;
    const next = { file: null };
    currentDraft.current = next;
    setDraft(next);
    setInvalid(null);
    operation.clearFailure();
  };
  const cancel = () => {
    if (operation.isActive()) return;
    closeDraft();
    operation.clearFailure();
  };
  const selectFile = (file: File | null) => {
    if (!operation.canStart() || !currentDraft.current) return;
    const next = { file };
    currentDraft.current = next;
    setDraft(next);
    setInvalid(null);
    operation.clearFailure();
  };
  const submit = async () => {
    const selectedDraft = currentDraft.current;
    if (!operation.canStart() || !selectedDraft) return false;
    const validation = validateMonitorImportFile(selectedDraft.file);
    if (!validation.valid) {
      setInvalid(validation.reason);
      return false;
    }
    return operation.execute(validation.file);
  };

  const state: MonitorImportState = { canImport, draft, invalid, failure: operation.failure, busy: operation.busy };
  return { state, actions: { open, cancel, selectFile, submit } };
}

function useMonitorImportOperation(
  canImport: boolean,
  reread: () => Promise<unknown>,
  onImported: () => void,
  closeDraft: () => void
) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [failure, setFailure] = useState<MonitorImportFailureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<ImportOwner | null>(null);
  const generation = useRef(0);
  const currentCanImport = useRef(canImport);
  const mounted = useRef(true);

  useMonitorImportRetirement(canImport, {
    currentCanImport,
    active,
    generation,
    mounted,
    closeDraft,
    setBusy,
    setFailure
  });

  const canStart = () => mounted.current && currentCanImport.current && active.current === null;
  const execute = (file: File) => {
    const controller = new AbortController();
    const owner = { generation: generation.current + 1, controller };
    generation.current = owner.generation;
    active.current = owner;
    setBusy(true);
    setFailure(null);
    const owns = () =>
      ownsMonitorImport(mounted.current, currentCanImport.current, active.current, generation.current, owner);
    return executeMonitorImport(file, {
      owner,
      owns,
      onImported,
      closeDraft,
      reread,
      warnRefresh: () => void message.warning(t('monitor.import.refreshFailure')),
      publishFailure: setFailure,
      finish: () => {
        if (!owns()) return;
        active.current = null;
        generation.current += 1;
        setBusy(false);
      }
    });
  };
  return {
    busy,
    failure,
    canStart,
    isActive: () => active.current !== null,
    clearFailure: () => {
      if (mounted.current) setFailure(null);
    },
    execute
  };
}

function ownsMonitorImport(
  mounted: boolean,
  canImport: boolean,
  active: ImportOwner | null,
  generation: number,
  owner: ImportOwner
) {
  return mounted && canImport && active === owner && generation === owner.generation;
}

function useMonitorImportRetirement(canImport: boolean, retirement: ImportRetirement) {
  const { currentCanImport, active, generation, mounted, closeDraft, setBusy, setFailure } = retirement;
  const retire = useCallback(
    (owner: ImportOwner) => {
      if (active.current !== owner) return;
      active.current = null;
      generation.current += 1;
      if (mounted.current) {
        setBusy(false);
        setFailure(null);
        closeDraft();
      }
      owner.controller.abort();
    },
    [active, closeDraft, generation, mounted, setBusy, setFailure]
  );
  useLayoutEffect(() => {
    currentCanImport.current = canImport;
    if (canImport) return;
    const owner = active.current;
    if (owner) retire(owner);
    else {
      closeDraft();
      setFailure(null);
    }
  }, [active, canImport, closeDraft, currentCanImport, retire, setFailure]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const owner = active.current;
      if (!owner) return;
      active.current = null;
      generation.current += 1;
      owner.controller.abort();
    };
  }, [active, generation, mounted]);
}
