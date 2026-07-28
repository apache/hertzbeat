/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type MessageServerActionCapabilities = {
  canConfigure: boolean;
};

export function messageServerActionCapabilities(roles: readonly string[]): MessageServerActionCapabilities {
  return { canConfigure: roles.includes('ADMIN') };
}
