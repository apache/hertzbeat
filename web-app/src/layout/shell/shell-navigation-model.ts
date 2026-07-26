/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { Action, IResourceItem } from '@refinedev/core';
import type { ReactNode } from 'react';

import type { TimeOwnership } from '@/shared/time';

export type ShellCapability = 'supported' | 'unknown' | 'unsupported';
export type ShellTimePolicy = TimeOwnership;
export type ShellResourceAction = Action;

export type ShellResourceMeta = {
  capability: ShellCapability;
  label?: string;
  labelKey: string;
  navigation: boolean;
  order: number;
  requiredRoles?: string[];
  timePolicy: ShellTimePolicy;
  actionTimePolicies?: Partial<Record<ShellResourceAction, ShellTimePolicy>>;
};

const shellCapabilities: readonly ShellCapability[] = ['supported', 'unknown', 'unsupported'];
const shellTimePolicies: readonly ShellTimePolicy[] = ['global', 'route_owned', 'none', 'unknown'];
const shellResourceActions: readonly ShellResourceAction[] = ['create', 'edit', 'list', 'show', 'clone'];

/** Reads HertzBeat-owned metadata from Refine's intentionally untyped extension bag. */
export function readShellResourceMeta(value: unknown): ShellResourceMeta | undefined {
  const fields = {
    capability: property(value, 'capability'),
    labelKey: property(value, 'labelKey'),
    label: optionalString(property(value, 'label')),
    navigation: property(value, 'navigation'),
    order: property(value, 'order'),
    timePolicy: property(value, 'timePolicy')
  };
  if (!validShellResourceFields(fields)) return undefined;
  const { capability, label, labelKey, navigation, order, timePolicy } = fields;
  const requiredRoles = stringArray(property(value, 'requiredRoles'));
  const actionTimePolicies = readActionTimePolicies(property(value, 'actionTimePolicies'));
  if (requiredRoles === null || actionTimePolicies === null) return undefined;
  return {
    capability,
    ...optionalLabel(label),
    labelKey,
    navigation,
    order,
    timePolicy,
    ...(requiredRoles ? { requiredRoles } : {}),
    ...(actionTimePolicies ? { actionTimePolicies } : {})
  };
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

export function buildShellNavigation(resources: readonly IResourceItem[]) {
  const items = new Map<string, ShellNavigationItem>();
  resources.forEach(resource => {
    const shell = readShellResourceMeta(resource.meta?.shell);
    if (!shell?.navigation) return;
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

type RawShellResourceFields = {
  capability: unknown;
  label: string | undefined | null;
  labelKey: unknown;
  navigation: unknown;
  order: unknown;
  timePolicy: unknown;
};

type ValidShellResourceFields = {
  capability: ShellCapability;
  label: string | undefined;
  labelKey: string;
  navigation: boolean;
  order: number;
  timePolicy: ShellTimePolicy;
};

function validShellResourceFields(fields: RawShellResourceFields): fields is ValidShellResourceFields {
  return (
    isMember(shellCapabilities, fields.capability) &&
    typeof fields.labelKey === 'string' &&
    fields.label !== null &&
    typeof fields.navigation === 'boolean' &&
    typeof fields.order === 'number' &&
    Number.isSafeInteger(fields.order) &&
    fields.order >= 0 &&
    isMember(shellTimePolicies, fields.timePolicy)
  );
}

function readActionTimePolicies(value: unknown): ShellResourceMeta['actionTimePolicies'] | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.keys(value).some(key => !shellResourceActions.some(action => action === key))) return null;
  const policies: Partial<Record<ShellResourceAction, ShellTimePolicy>> = {};
  for (const action of shellResourceActions) {
    const policy = property(value, action);
    if (policy === undefined) continue;
    if (!isMember(shellTimePolicies, policy)) return null;
    policies[action] = policy;
  }
  return policies;
}

function stringArray(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined;
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : null;
}

function optionalString(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : null;
}

function optionalLabel(label: string | undefined) {
  return label === undefined ? {} : { label };
}

function property(value: unknown, key: PropertyKey): unknown {
  return value && typeof value === 'object' ? Reflect.get(value, key) : undefined;
}

function isMember<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.some(candidate => candidate === value);
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
