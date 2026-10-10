/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
