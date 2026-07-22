/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { safeRedirectTarget } from '@/core/auth/navigation';

import { getAppRoute, type LegacyRouteDefinition } from './route-registry';

export function legacyRedirectTarget(definition: LegacyRouteDefinition, search: string, hash: string) {
  const targetPath = getAppRoute(definition.targetRouteId).path;
  const sanitized = safeRedirectTarget(`${targetPath}${search}${hash}`) ?? targetPath;
  const { pathname, search: safeSearch, hash: safeHash } = splitLocalTarget(sanitized);
  const mergedSearch = mergeFixedSearch(safeSearch, definition.fixedSearch);
  return `${pathname}${mergedSearch}${safeHash}`;
}

function splitLocalTarget(target: string) {
  const hashIndex = target.indexOf('#');
  const beforeHash = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : '';
  const searchIndex = beforeHash.indexOf('?');
  return {
    pathname: searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash,
    search: searchIndex >= 0 ? beforeHash.slice(searchIndex) : '',
    hash
  };
}

function mergeFixedSearch(search: string, fixedSearch: LegacyRouteDefinition['fixedSearch']) {
  const inherited = new URLSearchParams(search);
  const merged = new URLSearchParams();
  for (const [field, value] of fixedSearch) merged.append(field, value);
  for (const [field, value] of inherited) {
    if (!merged.has(field)) merged.append(field, value);
  }
  const value = merged.toString();
  return value ? `?${value}` : '';
}
