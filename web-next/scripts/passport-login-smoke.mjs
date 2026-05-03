import process from 'node:process';
import { startLocalReleaseServer } from './release-shell.mjs';
import {
  assertRouteLoads,
  loginWithPassword,
  refreshWithToken,
  requestMessage,
  requireMessageData
} from './release-shell-smoke.mjs';
import {
  buildExpectedPassportLoginQuery,
  buildPassportLoginAliasPath,
  PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET
} from './passport-login-smoke-lib.mjs';

const serverPort = Number.parseInt(process.env.PASSPORT_LOGIN_SMOKE_PORT || '4302', 10);
const explicitBaseUrl = process.env.PASSPORT_LOGIN_SMOKE_BASE_URL;
const identifier = process.env.PASSPORT_LOGIN_SMOKE_IDENTIFIER || 'admin';
const credential = process.env.PASSPORT_LOGIN_SMOKE_CREDENTIAL || 'hertzbeat';

let serverHandle = null;

try {
  if (explicitBaseUrl) {
    serverHandle = {
      baseUrl: explicitBaseUrl,
      stop: () => {}
    };
  } else {
    serverHandle = await startLocalReleaseServer({ port: serverPort });
  }

  const passportRoute = await assertRouteLoads(serverHandle.baseUrl, '/passport/login');
  const loginAliasRoute = await assertRouteLoads(serverHandle.baseUrl, buildPassportLoginAliasPath(), {
    expectedPath: '/passport/login',
    expectedQuery: buildExpectedPassportLoginQuery()
  });
  const tokens = await loginWithPassword(serverHandle.baseUrl, identifier, credential, 0);
  const bootstrapConfig = requireMessageData(
    await requestMessage(serverHandle.baseUrl, '/api/config/system', { token: tokens.token }),
    'Load post-login bootstrap config'
  );
  const refreshedTokens = await refreshWithToken(serverHandle.baseUrl, tokens.refreshToken);
  const returnTargetRoute = await assertRouteLoads(serverHandle.baseUrl, PASSPORT_LOGIN_SMOKE_REDIRECT_TARGET);

  console.log(
    JSON.stringify(
      {
        baseUrl: serverHandle.baseUrl,
        passportRoute,
        loginAliasRoute,
        bootstrapConfig: {
          locale: bootstrapConfig?.locale ?? null,
          theme: bootstrapConfig?.theme ?? null,
          timeZoneId: bootstrapConfig?.timeZoneId ?? null
        },
        tokenProbe: {
          accessToken: Boolean(tokens.token),
          refreshToken: Boolean(tokens.refreshToken),
          refreshedAccessToken: Boolean(refreshedTokens.token)
        },
        returnTargetRoute
      },
      null,
      2
    )
  );
} catch (error) {
  const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157';
  const localStartHint = explicitBaseUrl
    ? ''
    : '\nHint: if this environment cannot bind a local Next port, rerun with PASSPORT_LOGIN_SMOKE_BASE_URL pointing at an already-running release shell.';
  console.error(
    `passport-login smoke failed: ${error instanceof Error ? error.message : String(error)}\n` +
      `release-shell base: ${serverHandle?.baseUrl || explicitBaseUrl || `http://127.0.0.1:${serverPort}`}\n` +
      `configured BACKEND_ORIGIN: ${backendOrigin}` +
      localStartHint
  );
  process.exitCode = 1;
} finally {
  serverHandle?.stop?.();
}
