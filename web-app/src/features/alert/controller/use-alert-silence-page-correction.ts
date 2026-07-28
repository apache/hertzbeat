/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect } from 'react';
import type { useSearchParams } from 'react-router-dom';

import {
  writeAlertSilenceRoute,
  type AlertSilenceManagementContext,
  type AlertSilencePage,
  type AlertSilenceQuery
} from '../model/alert-silence-model';

export function useAlertSilencePageCorrection(
  query: AlertSilenceQuery,
  management: AlertSilenceManagementContext | null,
  page: AlertSilencePage | undefined,
  setParams: ReturnType<typeof useSearchParams>[1]
) {
  const overflow = page && page.content.length === 0 && page.totalElements > 0 && query.pageIndex >= page.totalPages;
  const totalPages = page?.totalPages;
  useEffect(() => {
    if (!overflow || totalPages === undefined) return;
    setParams(
      writeAlertSilenceRoute(
        { search: query.search, pageSize: query.pageSize, pageIndex: Math.max(0, totalPages - 1) },
        management
      ),
      { replace: true }
    );
  }, [management, overflow, query.pageSize, query.search, setParams, totalPages]);
  return Boolean(overflow);
}
