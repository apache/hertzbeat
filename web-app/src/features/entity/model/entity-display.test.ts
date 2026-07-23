/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { localizeEntityCode } from './entity-display';

describe('entity display codes', () => {
  const translate = (key: string) => `translated:${key}`;

  it('centralizes known resource, status, source, direction, and recognition codes', () => {
    expect(localizeEntityCode(translate, 'type', 'service')).toBe('translated:entity.values.type.service');
    expect(localizeEntityCode(translate, 'status', 'healthy')).toBe('translated:entity.values.status.healthy');
    expect(localizeEntityCode(translate, 'source', 'manual')).toBe('translated:entity.values.source.manual');
    expect(localizeEntityCode(translate, 'direction', 'outgoing')).toBe('translated:entity.values.direction.outgoing');
    expect(localizeEntityCode(translate, 'identityType', 'derived')).toBe(
      'translated:entity.values.identityType.derived'
    );
  });

  it('safely falls back to trimmed unknown codes and a missing marker', () => {
    expect(localizeEntityCode(translate, 'source', ' vendor_source ')).toBe('vendor_source');
    expect(localizeEntityCode(translate, 'source', '')).toBe('—');
  });
});
