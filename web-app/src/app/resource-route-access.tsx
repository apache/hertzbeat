/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
