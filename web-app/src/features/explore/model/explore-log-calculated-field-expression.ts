/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
