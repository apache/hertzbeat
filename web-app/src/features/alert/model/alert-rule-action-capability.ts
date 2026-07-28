/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const alertRuleWriteRoles = new Set(['ADMIN', 'USER']);
const alertRuleDeleteRoles = new Set(['ADMIN']);

export type AlertRuleActionCapabilities = {
  canWrite: boolean;
  canDelete: boolean;
};

/** Mirrors the shipped Sureness policy for /api/alert/** write methods. */
export function alertRuleActionCapabilities(roles: readonly string[]): AlertRuleActionCapabilities {
  return {
    canWrite: roles.some(role => alertRuleWriteRoles.has(role)),
    canDelete: roles.some(role => alertRuleDeleteRoles.has(role))
  };
}
