/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { saveBrowserDownload } from '@/shared/browser-download';

import { AlertRuleExportError, requestAlertRuleExport } from '../api/alert-rule-export-api';
import type { AlertRuleExportFormat } from '../model/alert-rule-export-model';

export function useAlertRuleExport() {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);

  const exportSelected = async (ids: readonly number[], format: AlertRuleExportFormat) => {
    if (active.current || ids.length === 0) return false;
    const controller = new AbortController();
    active.current = controller;
    setExporting(true);
    try {
      const artifact = await requestAlertRuleExport(ids, format, controller.signal);
      saveBrowserDownload(artifact);
      if (mounted.current) void message.success(t('alertRules.export.success'));
      return true;
    } catch (error) {
      if (mounted.current) {
        const kind = error instanceof AlertRuleExportError ? error.kind : 'error';
        void message.error(t(`alertRules.export.failure.${kind}`));
      }
      return false;
    } finally {
      if (active.current === controller) active.current = null;
      if (mounted.current) setExporting(false);
    }
  };

  return { exporting, exportSelected };
}
