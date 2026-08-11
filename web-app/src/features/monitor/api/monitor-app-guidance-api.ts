/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { apiMessageGet } from '@/core/http/api-message';
import type { SupportedLocale } from '@/core/i18n/i18n';

import { MonitorContractError } from '../model/monitor-contract';

const applicationIdentity = /^[a-z0-9][a-z0-9_-]*$/;
const resourceSchema = z.record(z.string(), z.string());

export type MonitorAppGuidance = {
  help: string | null;
  helpUrl: string | null;
};

export async function loadMonitorAppGuidance(
  app: string,
  locale: SupportedLocale,
  signal?: AbortSignal
): Promise<MonitorAppGuidance> {
  const identity = app.trim().toLowerCase();
  if (!applicationIdentity.test(identity)) throw new MonitorContractError();
  const value = await apiMessageGet(`/api/i18n/${encodeURIComponent(locale)}`, signal ? { signal } : undefined);
  const parsed = resourceSchema.safeParse(value);
  if (!parsed.success) throw new MonitorContractError();
  const prefix = `monitor.app.${identity}`;
  return {
    help: nonEmpty(parsed.data[`${prefix}.help`]),
    helpUrl: safeHttpUrl(parsed.data[`${prefix}.helpLink`])
  };
}

function nonEmpty(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeHttpUrl(value: string | undefined) {
  const normalized = nonEmpty(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
