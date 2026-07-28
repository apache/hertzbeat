/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { Action, IResourceItem } from '@refinedev/core';
import type { ReactNode } from 'react';
import { z } from 'zod';

import type { TimeOwnership } from '@/shared/time';

export type ShellCapability = 'supported' | 'unknown' | 'unsupported';
export type ShellTimePolicy = TimeOwnership;
export type ShellResourceAction = Action;

const shellTimePolicySchema = z.enum(['global', 'route_owned', 'none', 'unknown']);
const shellActionTimePoliciesSchema = z
  .object({
    create: shellTimePolicySchema.optional(),
    edit: shellTimePolicySchema.optional(),
    list: shellTimePolicySchema.optional(),
    show: shellTimePolicySchema.optional(),
    clone: shellTimePolicySchema.optional()
  })
  .strict();
const shellResourceMetaSchema = z
  .object({
    capability: z.enum(['supported', 'unknown', 'unsupported']),
    label: z.string().optional(),
    labelKey: z.string(),
    navigation: z.boolean(),
    order: z.number().int().nonnegative(),
    requiredRoles: z.array(z.string()).optional(),
    timePolicy: shellTimePolicySchema,
    actionTimePolicies: shellActionTimePoliciesSchema.optional()
  })
  .strict();

export type ShellResourceMeta = z.output<typeof shellResourceMetaSchema>;

/** Reads HertzBeat-owned metadata from Refine's intentionally untyped extension bag. */
export function readShellResourceMeta(value: unknown): ShellResourceMeta | undefined {
  const result = shellResourceMetaSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function resolveShellTimePolicy(shell: ShellResourceMeta | undefined, action: ShellResourceAction | undefined) {
  if (!shell) return 'unknown';
  return (action ? shell.actionTimePolicies?.[action] : undefined) ?? shell.timePolicy;
}

export type ShellNavigationItem = {
  capability: ShellCapability;
  children: ShellNavigationItem[];
  disabled: boolean;
  icon?: ReactNode;
  label?: string;
  labelKey: string;
  name: string;
  order: number;
  resource: IResourceItem;
  route?: string;
};

export function buildShellNavigation(resources: readonly IResourceItem[], roles: readonly string[] = []) {
  const items = new Map<string, ShellNavigationItem>();
  resources.forEach(resource => {
    const shell = readShellResourceMeta(resource.meta?.shell);
    if (!shell?.navigation || !hasShellRoleAccess(shell, roles)) return;
    const item: ShellNavigationItem = {
      capability: shell.capability,
      children: [],
      disabled: shell.capability !== 'supported',
      ...(shell.label ? { label: shell.label } : {}),
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

export function hasShellRoleAccess(shell: ShellResourceMeta | undefined, roles: readonly string[]) {
  if (!shell) return false;
  const requiredRoles = shell.requiredRoles ?? [];
  return requiredRoles.length === 0 || requiredRoles.some(role => roles.includes(role));
}

export function activeNavigationTrail(tree: readonly ShellNavigationItem[], location: string) {
  let match: { routeLength: number; trail: string[] } | undefined;
  const visit = (items: readonly ShellNavigationItem[], parents: string[]) => {
    items.forEach(item => {
      const trail = [...parents, item.name];
      if (item.route && routeMatches(item.route, location) && (!match || item.route.length > match.routeLength)) {
        match = { routeLength: item.route.length, trail };
      }
      visit(item.children, trail);
    });
  };
  visit(tree, []);
  return match?.trail ?? [];
}

function routeMatches(route: string, location: string) {
  const target = routeLocation(route);
  const current = routeLocation(location);
  if (!pathMatches(target.pathname, current.pathname)) return false;
  return [...target.search.keys()].every(key => {
    const required = target.search.getAll(key);
    const actual = current.search.getAll(key);
    return required.length === actual.length && required.every((value, index) => value === actual[index]);
  });
}

function routeLocation(value: string) {
  const separator = value.indexOf('?');
  return {
    pathname: (separator < 0 ? value : value.slice(0, separator)).replace(/\/$/, ''),
    search: new URLSearchParams(separator < 0 ? '' : value.slice(separator + 1))
  };
}

function pathMatches(route: string, pathname: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function sortNavigation(items: ShellNavigationItem[]) {
  items.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  items.forEach(item => sortNavigation(item.children));
}
