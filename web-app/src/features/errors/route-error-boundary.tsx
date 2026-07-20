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

import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useMatches, useRouteError } from 'react-router-dom';

const SAFE_ROUTE_ID = /^[a-z0-9-]{1,64}$/;

function describeRouteError(error: unknown, routeId: string | undefined) {
  const safeRouteId = routeId && SAFE_ROUTE_ID.test(routeId) ? routeId : 'unknown';
  if (isRouteErrorResponse(error)) {
    return { category: 'route-response', routeId: safeRouteId, status: error.status } as const;
  }
  return { category: error instanceof Error ? 'exception' : 'unknown', routeId: safeRouteId } as const;
}

export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const matches = useMatches();
  const routeId = matches[matches.length - 1]?.id;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Router errors can contain tokens, telemetry bodies, and backend payloads; log only a safe diagnostic shape.
    console.error('Route rendering failed', describeRouteError(error, routeId));
  }, [error, routeId]);

  return (
    <Result
      status="500"
      title={t('common.routeError.title')}
      subTitle={t('common.routeError.description')}
      extra={<Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>}
    />
  );
}
