/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type StatusManagementActionCapabilities = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const readRoles = new Set(['ADMIN', 'USER', 'GUEST']);
const writeRoles = new Set(['ADMIN', 'USER']);

export function statusManagementActionCapabilities(roles: readonly string[]): StatusManagementActionCapabilities {
  return {
    canRead: roles.some(role => readRoles.has(role)),
    canCreate: roles.some(role => writeRoles.has(role)),
    canUpdate: roles.some(role => writeRoles.has(role)),
    canDelete: roles.includes('ADMIN')
  };
}
