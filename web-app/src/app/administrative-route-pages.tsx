/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { lazy, Suspense } from 'react';

import { loadTokenPageRoute } from '@/features/settings/token';
import { RouteLoadingState } from '@/shared/route-state/route-state';

const TokenRoutePage = lazy(async () => {
  const route = await loadTokenPageRoute();
  if (!route.Component) throw new Error('Token route loader did not provide a component.');
  return { default: route.Component };
});
const PluginRoutePage = lazy(async () => {
  const { PluginPage } = await import('@/features/settings/plugin');
  return { default: PluginPage };
});
const DeploymentRoutePage = lazy(async () => {
  const { DeploymentPage } = await import('@/features/deployment');
  return { default: DeploymentPage };
});

export function AdministrativeTokenRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <TokenRoutePage />
    </Suspense>
  );
}

export function AdministrativePluginRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <PluginRoutePage />
    </Suspense>
  );
}

export function AdministrativeDeploymentRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <DeploymentRoutePage />
    </Suspense>
  );
}
