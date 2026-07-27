/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton } from 'antd';
import { lazy, Suspense } from 'react';

import { loadTokenPageRoute } from '@/features/settings/token';

const TokenRoutePage = lazy(async () => {
  const route = await loadTokenPageRoute();
  if (!route.Component) throw new Error('Token route loader did not provide a component.');
  return { default: route.Component };
});
const PluginRoutePage = lazy(async () => {
  const { PluginPage } = await import('@/features/settings/plugin');
  return { default: PluginPage };
});

export function AdministrativeTokenRoutePage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 4 }} />}>
      <TokenRoutePage />
    </Suspense>
  );
}

export function AdministrativePluginRoutePage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 4 }} />}>
      <PluginRoutePage />
    </Suspense>
  );
}
