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

import { apiMessageGet } from '@/core/http/api-message';

import { alertIntegrationApiRequest } from './alert-integration-api-failure';
import { parseAlertIntegrationCatalog, parseAlertIntegrationGuide } from './alert-integration-schema';

const catalogPath = '/api/alerts/integrations';

export function loadAlertIntegrationCatalog(signal?: AbortSignal) {
  return alertIntegrationApiRequest(async () =>
    parseAlertIntegrationCatalog(await apiMessageGet(catalogPath, signal ? { signal } : undefined))
  );
}

export function loadAlertIntegrationGuide(source: string, signal?: AbortSignal) {
  return alertIntegrationApiRequest(async () =>
    parseAlertIntegrationGuide(
      await apiMessageGet(`${catalogPath}/${encodeURIComponent(source)}`, signal ? { signal } : undefined),
      source
    )
  );
}
