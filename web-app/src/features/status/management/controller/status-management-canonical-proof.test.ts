/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { StatusRequestFailure } from '../../shared/status-error-model';
import { isAmbiguousStatusWriteFailure, requireStatusIncidentWritable } from './status-management-canonical-proof';

describe('Status canonical proof failure boundary', () => {
  it('uses stable write outcomes without transport knowledge', () => {
    expect(isAmbiguousStatusWriteFailure(new StatusRequestFailure('error', 'rejected'))).toBe(false);
    expect(isAmbiguousStatusWriteFailure(new StatusRequestFailure('unavailable', 'uncertain'))).toBe(true);
    expect(isAmbiguousStatusWriteFailure(new Error('domain failure'))).toBe(true);
  });

  it('accepts the backend newest-first incident history as the submitted update set', () => {
    const component = {
      id: 1,
      orgId: 1,
      name: 'API',
      method: 1,
      configState: 0,
      state: 0
    };
    const submitted = {
      id: 1,
      orgId: 1,
      name: 'Outage',
      state: 0,
      components: [component],
      contents: [
        { id: 1, incidentId: 1, message: 'Investigating', state: 0, timestamp: 100 },
        { incidentId: 1, message: 'Resolved', state: 0, timestamp: 200 }
      ]
    };
    const canonical = {
      ...submitted,
      contents: [
        { id: 2, incidentId: 1, message: 'Resolved', state: 0, timestamp: 200 },
        { id: 1, incidentId: 1, message: 'Investigating', state: 0, timestamp: 100 }
      ]
    };

    expect(() => requireStatusIncidentWritable(canonical, submitted)).not.toThrow();
  });
});
