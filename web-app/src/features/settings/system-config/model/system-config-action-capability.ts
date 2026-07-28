/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type SystemConfigActionCapabilities = {
  canConfigure: boolean;
};

export function systemConfigActionCapabilities(roles: readonly string[]): SystemConfigActionCapabilities {
  return { canConfigure: roles.includes('ADMIN') };
}
