/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { SETUP_PHASES } from './setup-contract';
import { setupRouteDecision } from './setup-route-gate';

const paths = { setup: '/setup', login: '/passport/login' };

describe('setup route gate model', () => {
  it.each(SETUP_PHASES.filter(phase => phase !== 'complete'))('redirects product routes to setup during %s', phase => {
    expect(setupRouteDecision(phase, '/dashboard', paths)).toEqual({ kind: 'redirect', to: '/setup' });
    expect(setupRouteDecision(phase, '/setup', paths)).toEqual({ kind: 'setup' });
  });

  it('allows product routes after server-confirmed completion', () => {
    expect(setupRouteDecision('complete', '/dashboard', paths)).toEqual({ kind: 'product' });
  });

  it('sends completed setup to login and never trusts a local step', () => {
    expect(setupRouteDecision('complete', '/setup', paths)).toEqual({
      kind: 'redirect',
      to: '/passport/login'
    });
  });
});
