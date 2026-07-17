/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { ShellHeader } from './shell-header';
import { ShellNavigation } from './shell-navigation';
import styles from './hertzbeat-shell.module.css';

export function HertzBeatShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      <ShellHeader collapsed={collapsed} />
      <div className={styles.shellBody}>
        <ShellNavigation
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
