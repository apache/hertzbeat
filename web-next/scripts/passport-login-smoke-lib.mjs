export const PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET = '/monitors?app=website';
export const PASSPORT_LOGIN_SMOKE_SOURCE = 'guard';

export function buildPassportLoginAliasPath(
  redirectTarget = PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET,
  source = PASSPORT_LOGIN_SMOKE_SOURCE
) {
  const params = new URLSearchParams({
    redirect: redirectTarget,
    source
  });
  return `/login?${params.toString()}`;
}

export function buildExpectedPassportLoginQuery(
  redirectTarget = PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET,
  source = PASSPORT_LOGIN_SMOKE_SOURCE
) {
  return {
    redirect: redirectTarget,
    source
  };
}
