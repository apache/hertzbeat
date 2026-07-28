/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export type InstrumentationTokenCapability = {
  canGenerateToken: boolean;
};

export function instrumentationTokenCapability(roles: readonly string[]): InstrumentationTokenCapability {
  return { canGenerateToken: roles.includes('ADMIN') };
}
