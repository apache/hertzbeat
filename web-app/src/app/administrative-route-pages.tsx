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
const DeploymentMigrationRoutePage = lazy(async () => {
  const { DeploymentMigrationPage } = await import('@/features/deployment');
  return { default: DeploymentMigrationPage };
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

export function AdministrativeDeploymentMigrationRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <DeploymentMigrationRoutePage />
    </Suspense>
  );
}
