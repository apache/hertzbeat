/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { LeftOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import { useResourceParams } from '@refinedev/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import { activeNavigationTrail, buildShellNavigation, type ShellNavigationItem } from './shell-navigation-model';
import styles from './hertzbeat-shell.module.css';
import { ShellNavigationFlyout } from './shell-navigation-flyout';
import { ShellNavigationLink } from './shell-navigation-link';

type ShellNavigationProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};
const noSessionRoles: readonly string[] = [];

export function ShellNavigation({ collapsed, onCollapsedChange }: ShellNavigationProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const location = useLocation();
  const { resources } = useResourceParams();
  const roles = session?.roles ?? noSessionRoles;
  const tree = useMemo(() => buildShellNavigation(resources, roles), [resources, roles]);
  const trail = useMemo(
    () => activeNavigationTrail(tree, `${location.pathname}${location.search}`),
    [location.pathname, location.search, tree]
  );
  const navigationContextKey = `${location.pathname}${location.search}:${trail.join('/')}`;
  const activeOpenAtDepth = useMemo(() => openTrailAtDepth(trail), [trail]);
  const [accordion, setAccordion] = useState(() => ({
    contextKey: navigationContextKey,
    openAtDepth: activeOpenAtDepth
  }));
  const openAtDepth = accordion.contextKey === navigationContextKey ? accordion.openAtDepth : activeOpenAtDepth;
  const visibleOpen = useMemo(() => new Set(openAtDepth.values()), [openAtDepth]);

  const toggle = (name: string, depth: number) => {
    setAccordion(() => {
      const next = new Map(openAtDepth);
      if (next.get(depth) === name) next.delete(depth);
      else next.set(depth, name);
      for (const openDepth of next.keys()) {
        if (openDepth > depth) next.delete(openDepth);
      }
      return { contextKey: navigationContextKey, openAtDepth: next };
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
        <NavigationBranches
          key={collapsed ? `collapsed:${location.pathname}` : 'expanded'}
          activeTrail={trail}
          collapsed={collapsed}
          open={visibleOpen}
          tree={tree}
          onToggle={toggle}
        />
      </nav>
      <button
        className={styles.collapseButton}
        type="button"
        aria-label={t(collapsed ? 'shell.navigation.expand' : 'shell.navigation.collapse')}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
      </button>
    </aside>
  );
}

function NavigationBranches({
  activeTrail,
  collapsed,
  onToggle,
  open,
  tree
}: {
  activeTrail: string[];
  collapsed: boolean;
  onToggle: (name: string, depth: number) => void;
  open: Set<string>;
  tree: ShellNavigationItem[];
}) {
  const [flyout, setFlyout] = useState<string>();
  return tree.map(item => (
    <NavigationBranch
      key={item.name}
      item={item}
      activeTrail={activeTrail}
      collapsed={collapsed}
      open={open}
      onToggle={onToggle}
      flyout={flyout}
      onFlyoutChange={setFlyout}
      depth={0}
    />
  ));
}

type NavigationBranchProps = {
  activeTrail: string[];
  collapsed: boolean;
  depth: number;
  item: ShellNavigationItem;
  flyout: string | undefined;
  onFlyoutChange: (name: string | undefined) => void;
  onToggle: (name: string, depth: number) => void;
  open: Set<string>;
};

function NavigationBranch(props: NavigationBranchProps) {
  const { t } = useTranslation();
  const { item, activeTrail, collapsed, depth, open } = props;
  const hasChildren = item.children.length > 0;
  const isOpen = open.has(item.name);
  const active = activeTrail.includes(item.name);
  const label = item.label ?? t(item.labelKey);

  if (collapsed && depth > 0) return null;
  if (collapsed && !item.route && hasChildren) {
    return (
      <ShellNavigationFlyout
        active={active}
        activeTrail={activeTrail}
        item={item}
        label={label}
        open={props.flyout === item.name}
        onOpenChange={next => props.onFlyoutChange(next ? item.name : undefined)}
      />
    );
  }
  return (
    <div className={styles.navigationBranch} data-depth={depth}>
      <NavigationBranchControl {...props} active={active} hasChildren={hasChildren} isOpen={isOpen} label={label} />
      {hasChildren && !collapsed && (
        <div className={styles.navigationChildrenMotion} data-open={String(isOpen)} aria-hidden={!isOpen}>
          <div className={styles.navigationChildrenClip}>
            <div className={styles.navigationChildren}>
              {item.children.map(child => (
                <NavigationBranch key={child.name} {...props} item={child} depth={depth + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavigationBranchControl(
  props: NavigationBranchProps & {
    active: boolean;
    hasChildren: boolean;
    isOpen: boolean;
    label: string;
  }
) {
  const { t } = useTranslation();
  const { item, activeTrail, collapsed, onToggle, hasChildren, isOpen, label } = props;
  if (!item.route) return <NavigationGroupControl {...props} />;
  return (
    <div className={styles.navigationRow}>
      <ShellNavigationLink item={item} active={activeTrail.at(-1) === item.name} collapsed={collapsed} label={label} />
      {hasChildren && !collapsed && (
        <button
          className={styles.navigationToggle}
          type="button"
          aria-label={t('shell.navigation.toggleGroup', { label })}
          aria-expanded={isOpen}
          onClick={() => onToggle(item.name, props.depth)}
        >
          <UpOutlined className={isOpen ? '' : styles.navigationToggleClosed} />
        </button>
      )}
    </div>
  );
}

function NavigationGroupControl(
  props: NavigationBranchProps & {
    active: boolean;
    hasChildren: boolean;
    isOpen: boolean;
    label: string;
  }
) {
  const { item, collapsed, onToggle, active, hasChildren, isOpen, label } = props;
  return (
    <div className={styles.navigationRow}>
      <button
        className={`${styles.navigationLink} ${styles.navigationGroupLink} ${
          active ? styles.navigationParentActive : ''
        } ${isOpen ? styles.navigationParentOpen : ''}`}
        type="button"
        aria-expanded={hasChildren ? isOpen : undefined}
        onClick={() => onToggle(item.name, props.depth)}
      >
        <span className={styles.navigationIcon} aria-hidden="true">
          {item.icon}
        </span>
        {!collapsed && <span className={styles.navigationText}>{label}</span>}
        {hasChildren && !collapsed && (
          <span className={styles.navigationChevron} aria-hidden="true">
            <UpOutlined className={isOpen ? '' : styles.navigationToggleClosed} />
          </span>
        )}
      </button>
    </div>
  );
}

function openTrailAtDepth(trail: string[]) {
  return new Map(trail.slice(0, -1).map((name, depth) => [depth, name]));
}
