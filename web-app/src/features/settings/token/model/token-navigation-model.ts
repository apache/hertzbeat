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

import { alertRoutePaths, buildAlertIntegrationPath } from '@/shared/navigation/app-paths';

const localOrigin = 'https://hertzbeat.local';
const integrationPrefix = alertRoutePaths.integrations.replace(':source', '');
const sourcePattern = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Accepts the one workflow that currently hands users into Token settings.
 * Rejecting query strings and fragments prevents credentials or nested redirects
 * from being carried back into an otherwise valid application route.
 */
export function safeTokenReturnTo(value?: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, localOrigin);
    if (url.origin !== localOrigin || url.search || url.hash || !url.pathname.startsWith(integrationPrefix)) {
      return null;
    }
    const encodedSource = url.pathname.slice(integrationPrefix.length);
    if (!encodedSource || encodedSource.includes('/')) return null;
    const source = decodeURIComponent(encodedSource);
    return sourcePattern.test(source) ? buildAlertIntegrationPath(source) : null;
  } catch {
    return null;
  }
}
