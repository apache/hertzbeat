/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { parseAdministratorResponse } from './setup-administrator-schema';

describe('setup administrator response schema', () => {
  it('accepts only the frozen optional-configuration transition', () => {
    expect(parseAdministratorResponse({ username: 'operator', phase: 'optional_configuration' })).toEqual({
      username: 'operator',
      phase: 'optional_configuration'
    });
    expect(() => parseAdministratorResponse({ username: 'operator', phase: 'complete' })).toThrow(
      'Setup response was invalid'
    );
  });
});
