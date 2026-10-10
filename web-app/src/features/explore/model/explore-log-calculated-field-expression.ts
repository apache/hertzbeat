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

import type { InspectorField } from './explore-log-inspector-builtin-model';
import type { LogColumn } from './explore-log-columns';

export function inspectorCalculatedExpression(field: InspectorField): string | undefined {
  const target = field.analysis?.field;
  if (!target) return undefined;
  if (target.source === 'attribute') return `@${target.key}`;
  if (target.source === 'resource') return `resource(${JSON.stringify(target.key)})`;
  if (target.source === 'builtin' && target.key === 'serviceName') return 'service';
  if (target.source === 'builtin' && target.key === 'environment' && field.path?.[0] === 'resource') {
    const key = field.path.slice(1).join('.');
    return key ? `resource(${JSON.stringify(key)})` : undefined;
  }
  return undefined;
}

export function columnCalculatedExpression(column: LogColumn): string | undefined {
  if (column.kind !== 'field' || column.path.length !== 1) return undefined;
  const key = column.path[0]!;
  return column.scope === 'attributes'
    ? `@${key}`
    : column.scope === 'resource'
      ? `resource(${JSON.stringify(key)})`
      : undefined;
}
