/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MonitorExportError, requestMonitorExport } from '../api/monitor-export-api';
import type { MonitorCapabilities } from '../model/monitor-capability-model';
import { saveMonitorExport } from '../model/monitor-export-download';
import type { MonitorExportFormat, MonitorExportScope } from '../model/monitor-export-model';

type ExportOwner = { generation: number; controller: AbortController };

export function useMonitorExport(selectedIds: number[], capabilities: Pick<MonitorCapabilities, 'canExport'>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { canExport } = capabilities;
  const [exporting, setExporting] = useState(false);
  const ownership = useMonitorExportOwnership(canExport, setExporting);

  const run = async (scope: MonitorExportScope, format: MonitorExportFormat) => {
    if (scope.kind === 'selected' && scope.ids.length === 0) return false;
    const owner = ownership.begin();
    if (!owner) return false;
    try {
      const artifact = await requestMonitorExport(scope, format, owner.controller.signal);
      // Abort is advisory: a retired transport may still resolve, so each
      // externally visible publication must re-check the exact current owner.
      if (!ownership.owns(owner)) return false;
      saveMonitorExport(artifact);
      if (!ownership.owns(owner)) return false;
      void message.success(t('monitor.export.success'));
      return ownership.owns(owner);
    } catch (error) {
      if (!ownership.owns(owner)) return false;
      const kind = error instanceof MonitorExportError ? error.kind : 'error';
      void message.error(t(`monitor.export.failure.${kind}`));
      return false;
    } finally {
      ownership.finish(owner);
    }
  };

  return {
    canExport,
    exporting,
    exportSelected: (format: MonitorExportFormat) => run({ kind: 'selected', ids: selectedIds }, format),
    exportAll: (format: MonitorExportFormat) => run({ kind: 'all' }, format)
  };
}

function useMonitorExportOwnership(canExport: boolean, setExporting: (exporting: boolean) => void) {
  const active = useRef<ExportOwner | null>(null);
  const generation = useRef(0);
  const currentCanExport = useRef(canExport);
  const mounted = useRef(true);
  const owns = (owner: ExportOwner) =>
    mounted.current && currentCanExport.current && active.current === owner && generation.current === owner.generation;
  const begin = () => {
    if (!mounted.current || !currentCanExport.current || active.current) return null;
    const owner = { generation: generation.current + 1, controller: new AbortController() };
    generation.current = owner.generation;
    active.current = owner;
    setExporting(true);
    return owner;
  };
  const finish = (owner: ExportOwner) => {
    if (!owns(owner)) return;
    active.current = null;
    generation.current += 1;
    setExporting(false);
  };
  const retire = useCallback(
    (owner: ExportOwner) => {
      if (active.current !== owner) return;
      active.current = null;
      generation.current += 1;
      if (mounted.current) setExporting(false);
      owner.controller.abort();
    },
    [setExporting]
  );
  useLayoutEffect(() => {
    currentCanExport.current = canExport;
    const owner = active.current;
    if (!canExport && owner) retire(owner);
  }, [canExport, retire]);
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
  }, []);
  return { begin, finish, owns };
}
