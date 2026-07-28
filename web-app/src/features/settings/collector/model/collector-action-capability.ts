/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type CollectorActionCapabilities = {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
};

const readRoles = new Set(['ADMIN', 'USER', 'GUEST']);
const writeRoles = new Set(['ADMIN', 'USER']);

export function collectorActionCapabilities(roles: readonly string[]): CollectorActionCapabilities {
  return {
    canRead: roles.some(role => readRoles.has(role)),
    canWrite: roles.some(role => writeRoles.has(role)),
    canDelete: roles.includes('ADMIN')
  };
}
