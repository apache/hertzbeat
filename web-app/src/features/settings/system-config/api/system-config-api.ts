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

import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';

import type { SystemConfigValue, TimezoneOption } from '../model/system-config-contract';
import { parseSystemConfig, parseSystemConfigMutationResult, parseTimezoneOptions } from './system-config-schema';

export type { SystemConfigValue, TimezoneOption };

export const systemConfigApiRoot = '/api/config';
const systemConfigEndpoint = `${systemConfigApiRoot}/system`;
export const systemConfigTimezonesEndpoint = `${systemConfigApiRoot}/timezones`;

export async function loadSystemConfig() {
  return parseSystemConfig(await apiMessageGet(systemConfigEndpoint));
}

export async function loadTimezones() {
  return parseTimezoneOptions(await apiMessageGet(systemConfigTimezonesEndpoint));
}

export async function saveSystemConfig(config: SystemConfigValue) {
  return parseSystemConfigMutationResult(await apiMessagePost(systemConfigEndpoint, config));
}
