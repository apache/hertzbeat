import { describe, expect, it } from 'vitest';
import {
  buildExpectedPassportLoginQuery,
  buildPassportLoginAliasPath,
  PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET,
  PASSPORT_LOGIN_SMOKE_SOURCE
} from './passport-login-smoke-lib.mjs';

describe('passport-login smoke helpers', () => {
  it('builds the legacy alias path with preserved redirect context', () => {
    expect(buildPassportLoginAliasPath()).toBe(
      '/login?redirect=%2Fmonitors%3Fapp%3Dwebsite&source=guard'
    );
  });

  it('returns the expected redirect query for the forwarded passport route', () => {
    expect(buildExpectedPassportLoginQuery()).toEqual({
      redirect: PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET,
      source: PASSPORT_LOGIN_SMOKE_SOURCE
    });
  });
});
