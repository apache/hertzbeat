/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { LeftOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import { useCan, useGo, useResourceParams } from '@refinedev/core';
import { Tooltip } from 'antd';
import { useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { activeNavigationTrail, buildShellNavigation, type ShellNavigationItem } from './shell-navigation-model';
import styles from './hertzbeat-shell.module.css';

type ShellNavigationProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function ShellNavigation({ collapsed, onCollapsedChange }: ShellNavigationProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { resources } = useResourceParams();
  const tree = useMemo(() => buildShellNavigation(resources), [resources]);
  const trail = useMemo(() => activeNavigationTrail(tree, location.pathname), [location.pathname, tree]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.map(item => item.name)));
  const visibleOpen = useMemo(() => new Set([...open, ...trail.slice(0, -1)]), [open, trail]);

  const toggle = (name: string) => {
    setOpen(current => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <aside
      className={styles.navigation}
      aria-label={t('menu.primary')}
      data-collapsed={String(collapsed)}
      data-testid="shell-navigation"
    >
      <nav className={styles.navigationScroll}>
        {tree.map(item => (
          <NavigationBranch
            key={item.name}
            item={item}
            activeTrail={trail}
            collapsed={collapsed}
            open={visibleOpen}
            onToggle={toggle}
            depth={0}
          />
        ))}
      </nav>
      <button
        className={styles.collapseButton}
        type="button"
        aria-label={t(collapsed ? 'shell.navigation.expand' : 'shell.navigation.collapse')}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
        {!collapsed && <span>{t('shell.navigation.collapse')}</span>}
      </button>
    </aside>
  );
}

type NavigationBranchProps = {
  activeTrail: string[];
  collapsed: boolean;
  depth: number;
  item: ShellNavigationItem;
  onToggle: (name: string) => void;
  open: Set<string>;
};

function NavigationBranch(props: NavigationBranchProps) {
  const { t } = useTranslation();
  const { item, activeTrail, collapsed, depth, open } = props;
  const hasChildren = item.children.length > 0;
  const isOpen = open.has(item.name);
  const active = activeTrail.includes(item.name);
  const label = t(item.labelKey);

  if (collapsed && depth > 0) return null;
  return (
    <div className={styles.navigationBranch} data-depth={depth}>
      <NavigationBranchControl
        {...props}
        active={active}
        hasChildren={hasChildren}
        isOpen={isOpen}
        label={label}
      />
      {hasChildren && isOpen && !collapsed && (
        <div className={styles.navigationChildren}>
          {item.children.map(child => (
            <NavigationBranch
              key={child.name}
              {...props}
              item={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationBranchControl(props: NavigationBranchProps & {
  active: boolean;
  hasChildren: boolean;
  isOpen: boolean;
  label: string;
}) {
  const { t } = useTranslation();
  const { item, activeTrail, collapsed, onToggle, active, hasChildren, isOpen, label } = props;
  return (
    <div className={styles.navigationRow}>
      {item.route ? (
        <NavigationLink item={item} active={activeTrail.at(-1) === item.name} collapsed={collapsed} label={label} />
      ) : (
        <Tooltip title={collapsed ? label : undefined} placement="right">
          <button
            className={`${styles.navigationLink} ${active ? styles.navigationParentActive : ''}`}
            type="button"
            onClick={() => onToggle(item.name)}
          >
            <span className={styles.navigationIcon} aria-hidden="true">{item.icon}</span>
            {!collapsed && <span className={styles.navigationText}>{label}</span>}
          </button>
        </Tooltip>
      )}
      {hasChildren && !collapsed && (
        <button
          className={styles.navigationToggle}
          type="button"
          aria-label={t('shell.navigation.toggleGroup', { label })}
          aria-expanded={isOpen}
          onClick={() => onToggle(item.name)}
        >
          <UpOutlined className={isOpen ? '' : styles.navigationToggleClosed} />
        </button>
      )}
    </div>
  );
}

function NavigationLink(props: { active: boolean; collapsed: boolean; item: ShellNavigationItem; label: string }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const go = useGo();
  const { active, collapsed, item, label } = props;
  const access = useCan({
    resource: item.name,
    action: 'list',
    params: { resource: item.resource, roles: session?.roles ?? [] },
    queryOptions: { staleTime: Number.POSITIVE_INFINITY }
  });
  const disabled = item.disabled || access.isLoading || access.data?.can === false;
  const tooltip = collapsed ? label : disabled ? t(`shell.capability.${item.capability}`) : undefined;

  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!disabled && item.route) go({ to: item.route, type: 'push' });
  };

  return (
    <Tooltip title={tooltip} placement="right">
      <a
        className={`${styles.navigationLink} ${active ? styles.navigationLinkActive : ''}`}
        href={item.route}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        onClick={navigate}
      >
        <span className={styles.navigationIcon} aria-hidden="true">{item.icon}</span>
        {!collapsed && <span className={styles.navigationText}>{label}</span>}
      </a>
    </Tooltip>
  );
}
