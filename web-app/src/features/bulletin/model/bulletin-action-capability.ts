/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type BulletinActionCapabilities = {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
};

export function bulletinActionCapabilities(roles: readonly string[]): BulletinActionCapabilities {
  const canRead = roles.some(role => role === 'ADMIN' || role === 'USER' || role === 'GUEST');
  return {
    canRead,
    canWrite: roles.some(role => role === 'ADMIN' || role === 'USER'),
    canDelete: roles.includes('ADMIN')
  };
}
