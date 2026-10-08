/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
