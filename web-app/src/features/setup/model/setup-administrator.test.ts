/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { administratorFormComplete, createAdministratorRequest } from './setup-administrator';

describe('setup administrator model', () => {
  it('requires username, password, and exact confirmation without normalizing secret bytes', () => {
    expect(administratorFormComplete({ username: 'operator', password: 'secret', confirmPassword: 'different' })).toBe(
      false
    );
    expect(administratorFormComplete({ username: ' ', password: 'secret', confirmPassword: 'secret' })).toBe(false);
    expect(
      administratorFormComplete({
        username: 'operator',
        password: '  secret bytes  ',
        confirmPassword: '  secret bytes  '
      })
    ).toBe(true);
    expect(createAdministratorRequest('operator', '  secret bytes  ')).toEqual({
      username: 'operator',
      password: '  secret bytes  '
    });
  });
});
