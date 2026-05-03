/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EntityDiscoveryGovernancePreset } from '../../pojo/EntityDiscoveryGovernance';

export type DiscoveryGovernancePreset = EntityDiscoveryGovernancePreset;

export const ENTITY_DISCOVERY_PRESET_STORAGE_KEY = 'hzb.entity.discovery.presets';
export const GOVERNANCE_PRESET_QUERY_PREFIX = 'governancePreset';

type QueryValueReader = {
  get(key: string): string | null;
};

export function readDiscoveryGovernancePresets(limit = 8): DiscoveryGovernancePreset[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(ENTITY_DISCOVERY_PRESET_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DiscoveryGovernancePreset[];
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function writeDiscoveryGovernancePresets(presets: DiscoveryGovernancePreset[], limit = 8): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ENTITY_DISCOVERY_PRESET_STORAGE_KEY, JSON.stringify(presets.slice(0, limit)));
  } catch {
    // ignore storage persistence failures
  }
}

export function buildGovernancePresetQueryParams(preset?: Partial<DiscoveryGovernancePreset> | null): Record<string, string> {
  if (preset == null) {
    return {};
  }
  const params: Record<string, string> = {};
  appendQueryValue(params, 'Id', preset.id);
  appendQueryValue(params, 'Name', preset.name);
  appendQueryValue(params, 'Owner', preset.owner);
  appendQueryValue(params, 'System', preset.system);
  appendQueryValue(params, 'Source', preset.source);
  appendQueryValue(params, 'Environment', preset.environment);
  appendQueryValue(params, 'Status', preset.status);
  appendQueryValue(params, 'BulkOwner', preset.bulkOwner);
  appendQueryValue(params, 'BulkSystem', preset.bulkSystem);
  return params;
}

export function readGovernancePresetFromQuery(source: QueryValueReader): DiscoveryGovernancePreset | undefined {
  const preset: DiscoveryGovernancePreset = {
    id: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Id`)) || '',
    name: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Name`)) || '',
    owner: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Owner`)) || undefined,
    system: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}System`)) || undefined,
    source: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Source`)) || undefined,
    environment: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Environment`)) || undefined,
    status: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}Status`)) || undefined,
    bulkOwner: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}BulkOwner`)) || undefined,
    bulkSystem: trimText(source.get(`${GOVERNANCE_PRESET_QUERY_PREFIX}BulkSystem`)) || undefined
  };
  const hasValues = [
    preset.id,
    preset.name,
    preset.owner,
    preset.system,
    preset.source,
    preset.environment,
    preset.status,
    preset.bulkOwner,
    preset.bulkSystem
  ].some(value => trimText(value) != null);
  return hasValues ? preset : undefined;
}

export function isGovernancePresetQueryKey(key: string): boolean {
  return key.startsWith(GOVERNANCE_PRESET_QUERY_PREFIX);
}

function appendQueryValue(params: Record<string, string>, suffix: string, value?: string | null): void {
  const normalized = trimText(value);
  if (normalized == null) {
    return;
  }
  params[`${GOVERNANCE_PRESET_QUERY_PREFIX}${suffix}`] = normalized;
}

function trimText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
