/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const entityWriteRoles = new Set(['ADMIN', 'USER']);
const entityDeleteRoles = new Set(['ADMIN']);

export type EntityCapabilities = {
  canWrite: boolean;
  canDelete: boolean;
};

/** Mirrors the shipped Sureness policy for Entity write and delete admission. */
export function entityCapabilities(roles: readonly string[]): EntityCapabilities {
  return {
    canWrite: roles.some(role => entityWriteRoles.has(role)),
    canDelete: roles.some(role => entityDeleteRoles.has(role))
  };
}
