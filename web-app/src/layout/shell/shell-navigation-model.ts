/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { IResourceItem } from '@refinedev/core';
import type { ReactNode } from 'react';

export type ShellCapability = 'supported' | 'unknown' | 'unsupported';
export type ShellTimePolicy = 'global' | 'route_owned' | 'none' | 'unknown';

export type ShellResourceMeta = {
  capability: ShellCapability;
  labelKey: string;
  navigation: boolean;
  order: number;
  requiredRoles?: string[];
  timePolicy: ShellTimePolicy;
};

export type ShellNavigationItem = {
  capability: ShellCapability;
  children: ShellNavigationItem[];
  disabled: boolean;
  icon?: ReactNode;
  labelKey: string;
  name: string;
  order: number;
  resource: IResourceItem;
  route?: string;
};

export function buildShellNavigation(resources: readonly IResourceItem[]) {
  const items = new Map<string, ShellNavigationItem>();
  resources.forEach(resource => {
    const shell = resource.meta?.shell as ShellResourceMeta | undefined;
    if (!shell?.navigation) return;
    const item: ShellNavigationItem = {
      capability: shell.capability,
      children: [],
      disabled: shell.capability !== 'supported',
      labelKey: shell.labelKey,
      name: resource.name,
      order: shell.order,
      resource,
      ...(resource.meta?.icon ? { icon: resource.meta.icon } : {}),
      ...(resource.list ? { route: resource.list } : {})
    };
    items.set(resource.name, item);
  });

  const roots: ShellNavigationItem[] = [];
  items.forEach(item => {
    const parentName = item.resource.meta?.parent;
    const parent = typeof parentName === 'string' ? items.get(parentName) : undefined;
    if (parent) parent.children.push(item);
    else roots.push(item);
  });
  sortNavigation(roots);
  return roots;
}

export function activeNavigationTrail(tree: readonly ShellNavigationItem[], pathname: string) {
  let match: { routeLength: number; trail: string[] } | undefined;
  const visit = (items: readonly ShellNavigationItem[], parents: string[]) => {
    items.forEach(item => {
      const trail = [...parents, item.name];
      if (item.route && routeMatches(item.route, pathname) && (!match || item.route.length > match.routeLength)) {
        match = { routeLength: item.route.length, trail };
      }
      visit(item.children, trail);
    });
  };
  visit(tree, []);
  return match?.trail ?? [];
}

function routeMatches(route: string, pathname: string) {
  const normalizedRoute = route.replace(/\/$/, '');
  const normalizedPath = pathname.replace(/\/$/, '');
  return normalizedPath === normalizedRoute || normalizedPath.startsWith(`${normalizedRoute}/`);
}

function sortNavigation(items: ShellNavigationItem[]) {
  items.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  items.forEach(item => sortNavigation(item.children));
}
