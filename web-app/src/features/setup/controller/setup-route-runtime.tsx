/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { RouteLoadingState, RouteStateFrame } from '@/shared/route-state/route-state';

import { SetupRouteBoundary } from '../components/setup-route-boundary';
import { SetupRouteContext } from './setup-route-context';
import { useSetupRouteController } from './use-setup-route-controller';

type SetupPaths = { setup: string; login: string };

export function SetupRouteRuntime({ paths, product }: { paths: SetupPaths; product: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SetupRouteRuntimeContent paths={paths} product={product} />
    </QueryClientProvider>
  );
}

function SetupRouteRuntimeContent({ paths, product }: { paths: SetupPaths; product: ReactNode }) {
  const { t } = useTranslation();
  const controller = useSetupRouteController();
  const setup =
    controller.state === 'ready' ? (
      <SetupRouteContext.Provider value={controller}>
        <Outlet />
      </SetupRouteContext.Provider>
    ) : (
      <Outlet />
    );
  return (
    <SetupRouteBoundary
      controller={controller}
      paths={paths}
      product={product}
      setup={setup}
      loading={<RouteLoadingState placement="viewport" />}
      unavailable={retry => (
        <RouteStateFrame
          placement="viewport"
          headingLevel={1}
          kind="unavailable"
          title={t('setup.statusUnavailable')}
          action={<Button onClick={retry}>{t('common.retry')}</Button>}
        />
      )}
    />
  );
}
