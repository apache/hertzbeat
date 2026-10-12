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

import type { LogInspectorFilterTarget } from '../model/explore-log-inspector-filter';
import type { JsonValue } from '../model/explore-signal-contract';

export function unsupportedFieldFilter(path: string[], value: JsonValue): LogInspectorFilterTarget | undefined {
  if (
    path.length < 2 ||
    !['resource', 'attributes'].includes(path[0] ?? '') ||
    value === null ||
    typeof value !== 'object'
  )
    return undefined;
  return {
    scope: path[0] === 'resource' ? 'resource' : 'attribute',
    key: path[1]!,
    value: JSON.stringify(value),
    collection: true,
    valueKind: 'unsupported'
  };
}
