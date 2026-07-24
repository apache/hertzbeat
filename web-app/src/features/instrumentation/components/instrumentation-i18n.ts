/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import type { TFunction } from 'i18next';

export function translateBackend(t: TFunction, key: string) {
  return t(key, { defaultValue: t('instrumentation.v2.unknownGuidance') });
}
