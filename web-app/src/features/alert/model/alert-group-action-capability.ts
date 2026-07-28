/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const alertGroupWriteRoles = new Set(['ADMIN', 'USER']);
const alertGroupDeleteRoles = new Set(['ADMIN']);

export type AlertGroupActionCapabilities = {
  canWrite: boolean;
  canDelete: boolean;
};

/** Mirrors the shipped Sureness policy for /api/alert/** methods. */
export function alertGroupActionCapabilities(roles: readonly string[]): AlertGroupActionCapabilities {
  return {
    canWrite: roles.some(role => alertGroupWriteRoles.has(role)),
    canDelete: roles.some(role => alertGroupDeleteRoles.has(role))
  };
}
