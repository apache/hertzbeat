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

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { RouteStateFrame } from '@/shared/route-state/route-state';

import { refineResources, resolveShellAccess } from './refine/refine-resource-registry';
import { getAppRoute, type AppResourceRouteId } from './route-registry';

export function ResourceRouteAccess({ children, routeId }: { children?: ReactNode; routeId: AppResourceRouteId }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const route = getAppRoute(routeId);
  const resource = refineResources.find(candidate => candidate.name === route.id);
  if (!resource) throw new Error(`Resource route ${routeId} has no Refine resource.`);
  const access = resolveShellAccess({ resource, roles: session?.roles ?? [] });
  if (access.can) return children ?? <Outlet />;
  return (
    <RouteStateFrame
      kind="permission"
      title={t('common.permission.additionalRequiredTitle')}
      description={t('common.permission.roleRequiredDescription')}
    />
  );
}
