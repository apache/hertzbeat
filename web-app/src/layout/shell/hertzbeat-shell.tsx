/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useState } from 'react';
import { useResourceParams } from '@refinedev/core';
import { Outlet, useLocation } from 'react-router-dom';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { signalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import { ShellInvestigationProvider } from '@/shared/investigation';
import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider, type TimeOwnership } from '@/shared/time';

import { ShellHeader } from './shell-header';
import { ShellNavigation } from './shell-navigation';
import { readShellResourceMeta, resolveShellTimePolicy } from './shell-navigation-model';
import styles from './hertzbeat-shell.module.css';

const NARROW_SHELL_QUERY = '(max-width: 768px)';

export function HertzBeatShell() {
  return (
    <QueryContextProvider>
      <GlobalTimeProvider>
        <RouteOwnedShell />
      </GlobalTimeProvider>
    </QueryContextProvider>
  );
}

function RouteOwnedShell() {
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const location = useLocation();
  const narrowCollapsed = useNarrowNavigation();
  const collapsed = manualCollapsed || narrowCollapsed;
  const { action, resource } = useResourceParams();
  const policy: TimeOwnership = resolveShellTimePolicy(readShellResourceMeta(resource?.meta?.shell), action);
  return (
    <RouteTimeProvider
      key={`${location.pathname}:${policy}`}
      policy={policy}
      canonicalizeInvalidExact={
        location.pathname !== applicationRoutePaths.explore &&
        location.pathname !== applicationRoutePaths.services &&
        location.pathname !== signalDashboardPath
      }
    >
      <ShellInvestigationProvider>
        <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
          <ShellHeader />
          <div className={styles.shellBody}>
            <ShellNavigation
              collapsed={collapsed}
              collapseLocked={narrowCollapsed}
              onCollapsedChange={setManualCollapsed}
            />
            <main className={styles.content}>
              <Outlet />
            </main>
          </div>
        </div>
      </ShellInvestigationProvider>
    </RouteTimeProvider>
  );
}

function useNarrowNavigation() {
  const [narrow, setNarrow] = useState(() => matchesNarrowViewport());
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(NARROW_SHELL_QUERY);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return narrow;
}

function matchesNarrowViewport() {
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_SHELL_QUERY).matches;
}
