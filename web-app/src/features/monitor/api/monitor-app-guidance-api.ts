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

import { z } from 'zod';

import { apiMessageGet } from '@/core/http/api-message';
import type { SupportedLocale } from '@/core/i18n/i18n';

import { MonitorContractError } from '../model/monitor-contract';

const applicationIdentity = /^[a-z0-9][a-z0-9_-]*$/;
const resourceSchema = z.record(z.string(), z.string());

export const monitorI18nResourcesPath = (locale: SupportedLocale) => `/api/i18n/${encodeURIComponent(locale)}`;

export async function loadMonitorI18nResources(locale: SupportedLocale, signal?: AbortSignal) {
  const value = await apiMessageGet(monitorI18nResourcesPath(locale), signal ? { signal } : undefined);
  const parsed = resourceSchema.safeParse(value);
  if (!parsed.success) throw new MonitorContractError();
  return parsed.data;
}

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
  const resources = await loadMonitorI18nResources(locale, signal);
  const prefix = `monitor.app.${identity}`;
  return {
    help: nonEmpty(resources[`${prefix}.help`]),
    helpUrl: safeHttpUrl(resources[`${prefix}.helpLink`])
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
