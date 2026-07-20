/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState } from 'react';
import { useResourceParams } from '@refinedev/core';
import { Outlet, useLocation } from 'react-router-dom';

import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider, type TimeOwnership } from '@/shared/time';

import { ShellHeader } from './shell-header';
import { ShellNavigation } from './shell-navigation';
import { resolveShellTimePolicy, type ShellResourceMeta } from './shell-navigation-model';
import styles from './hertzbeat-shell.module.css';

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
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { action, resource } = useResourceParams();
  const policy: TimeOwnership = resolveShellTimePolicy(resource?.meta?.shell as ShellResourceMeta | undefined, action);
  return (
    <RouteTimeProvider key={`${location.pathname}:${policy}`} policy={policy}>
      <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
        <ShellHeader collapsed={collapsed} />
        <div className={styles.shellBody}>
          <ShellNavigation collapsed={collapsed} onCollapsedChange={setCollapsed} />
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </RouteTimeProvider>
  );
}
