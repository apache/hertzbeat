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

import { useCan, useGo } from '@refinedev/core';
import { Tooltip } from 'antd';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { buildExploreSignalNavigationPath } from '@/features/explore/model/explore-model';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

import styles from './hertzbeat-shell.module.css';
import type { ShellNavigationItem } from './shell-navigation-model';

type ShellNavigationLinkProps = {
  active: boolean;
  collapsed: boolean;
  item: ShellNavigationItem;
  label: string;
  onNavigate?: () => void;
};

/** Keeps permission, disabled, tooltip, and Refine navigation behavior identical in the sidebar and flyout. */
export function ShellNavigationLink(props: ShellNavigationLinkProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const go = useGo();
  const location = useLocation();
  const { active, collapsed, item, label } = props;
  const route = exploreSignalDestination(item, location.pathname, location.search);
  const access = useCan({
    resource: item.name,
    action: 'list',
    params: { resource: item.resource, roles: session?.roles ?? [] },
    queryOptions: { staleTime: Number.POSITIVE_INFINITY }
  });
  const disabled = item.disabled || access.isLoading || access.data?.can === false;
  const tooltip = resolveTooltip({
    capability: item.capability,
    collapsed,
    disabled,
    label,
    roleDenied: access.data?.can === false && access.data.reason === 'ROLE_REQUIRED',
    translate: key => t(key)
  });
  const linkClassName = active ? `${styles.navigationLink} ${styles.navigationLinkActive}` : styles.navigationLink;

  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled || !route) {
      event.preventDefault();
      return;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (route === `${location.pathname}${location.search}`) return;
    props.onNavigate?.();
    go({ to: route, type: 'push' });
  };

  return (
    <Tooltip title={tooltip} placement="right">
      <a
        className={linkClassName}
        href={route}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        onClick={navigate}
      >
        <span className={styles.navigationIcon} aria-hidden="true">
          {item.icon}
        </span>
        {!collapsed && <span className={styles.navigationText}>{label}</span>}
      </a>
    </Tooltip>
  );
}

function exploreSignalDestination(item: ShellNavigationItem, pathname: string, search: string) {
  if (pathname !== applicationRoutePaths.explore) return item.route;
  const signal = item.name === 'explore-logs' ? 'logs' : item.name === 'explore-traces' ? 'traces' : null;
  if (signal) return buildExploreSignalNavigationPath(search, signal);
  return item.name === 'explore' ? buildExploreSignalNavigationPath(search, 'metrics') : item.route;
}

function resolveTooltip(options: {
  capability: ShellNavigationItem['capability'];
  collapsed: boolean;
  disabled: boolean;
  label: string;
  roleDenied: boolean;
  translate: (key: string) => string;
}) {
  if (options.roleDenied) return options.translate('shell.permission.roleRequired');
  if (options.collapsed) return options.label;
  if (options.disabled) return options.translate(`shell.capability.${options.capability}`);
  return undefined;
}
