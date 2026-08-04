/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { visibleSettingsNavigationGroups } from './settings-navigation-model';
import styles from './settings-route-layout.module.css';

const noRoles: readonly string[] = [];

export function SettingsRouteLayout() {
  const { t } = useTranslation();
  const { session } = useSession();
  const roles = session?.roles ?? noRoles;
  const groups = useMemo(() => visibleSettingsNavigationGroups(roles), [roles]);

  return (
    <div className={styles.layout} data-settings-route-layout="">
      <nav className={styles.navigation} aria-label={t('settingsNavigation.ariaLabel')}>
        {groups.map(group => {
          const labelId = `settings-navigation-${group.id}`;
          return (
            <section key={group.id} className={styles.group} aria-labelledby={labelId}>
              <div id={labelId} className={styles.groupLabel}>
                {t(group.labelKey)}
              </div>
              <div className={styles.links}>
                {group.items.map(item => (
                  <NavLink
                    key={item.id}
                    end
                    className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    to={item.path}
                  >
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>
            </section>
          );
        })}
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
