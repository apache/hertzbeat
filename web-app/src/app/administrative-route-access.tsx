/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { refineResources, resolveShellAccess } from './refine/refine-resource-registry';
import { getAppRoute } from './route-registry';

type AdministrativeRouteId = 'tokens' | 'plugins';

export function AdministrativeRouteAccess({
  children,
  routeId
}: {
  children?: ReactNode;
  routeId: AdministrativeRouteId;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const route = getAppRoute(routeId);
  const resource = refineResources.find(candidate => candidate.name === route.id);
  if (!resource) throw new Error(`Administrative route ${routeId} has no Refine resource.`);
  const access = resolveShellAccess({ resource, roles: session?.roles ?? [] });
  if (access.can) return children ?? <Outlet />;
  return (
    <Alert
      data-route-access-denied={routeId}
      type="warning"
      showIcon
      message={t('common.permission.roleRequiredTitle')}
      description={t('common.permission.roleRequiredDescription')}
    />
  );
}
