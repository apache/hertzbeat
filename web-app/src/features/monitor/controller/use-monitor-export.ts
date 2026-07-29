/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
    if (
      !ownership.mounted.current ||
      !ownership.currentCanExport.current ||
      ownership.active.current ||
      (scope.kind === 'selected' && scope.ids.length === 0)
    )
      return false;
    const controller = new AbortController();
    const owner = { generation: ownership.generation.current + 1, controller };
    ownership.generation.current = owner.generation;
    ownership.active.current = owner;
    setExporting(true);
    const ownsExport = () =>
      ownership.mounted.current &&
      ownership.currentCanExport.current &&
      ownership.active.current === owner &&
      ownership.generation.current === owner.generation;
    try {
      const artifact = await requestMonitorExport(scope, format, controller.signal);
      // Abort is advisory: a retired transport may still resolve, so each
      // externally visible publication must re-check the exact current owner.
      if (!ownsExport()) return false;
      saveMonitorExport(artifact);
      if (!ownsExport()) return false;
      void message.success(t('monitor.export.success'));
      return ownsExport();
    } catch (error) {
      if (!ownsExport()) return false;
      const kind = error instanceof MonitorExportError ? error.kind : 'error';
      void message.error(t(`monitor.export.failure.${kind}`));
      return false;
    } finally {
      if (ownsExport()) {
        ownership.active.current = null;
        ownership.generation.current += 1;
        setExporting(false);
      }
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
  return { active, generation, currentCanExport, mounted };
}
