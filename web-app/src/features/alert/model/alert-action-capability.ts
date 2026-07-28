/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const alertWriteRoles = new Set(['ADMIN', 'USER']);
const alertDeleteRoles = new Set(['ADMIN']);

export type AlertActionCapabilities = {
  canWrite: boolean;
  canDelete: boolean;
};

/** Mirrors the shipped Sureness method policy shared by /api/alert/** resources. */
export function alertActionCapabilities(roles: readonly string[]): AlertActionCapabilities {
  return {
    canWrite: roles.some(role => alertWriteRoles.has(role)),
    canDelete: roles.some(role => alertDeleteRoles.has(role))
  };
}
