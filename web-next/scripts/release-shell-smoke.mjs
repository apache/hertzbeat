export function requestHeaders(token, hasBody = false, extraHeaders = {}) {
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {})
  };
}

export async function readJsonResponse(response, context) {
  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}: ${payloadText || response.statusText}`);
  }

  try {
    return payloadText ? JSON.parse(payloadText) : {};
  } catch (error) {
    throw new Error(`${context} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function requestMessage(
  baseUrl,
  path,
  {
    method = 'GET',
    token = null,
    body = null,
    headers = null,
    redirect = 'follow'
  } = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders(token, body !== null, headers || {}),
    body: body === null ? undefined : JSON.stringify(body),
    cache: 'no-store',
    redirect
  });
  return readJsonResponse(response, `${method} ${path}`);
}

export function requireMessageData(message, context) {
  if (message?.code !== 0) {
    throw new Error(`${context} failed: ${message?.msg || message?.code || 'unknown error'}`);
  }
  return message.data;
}

export function buildExpectedQueryEntries(expectedQuery = {}) {
  return Object.entries(expectedQuery)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)]);
}

export function findMismatchedQueryEntries(actualUrl, expectedQuery = {}) {
  const url = actualUrl instanceof URL ? actualUrl : new URL(actualUrl);
  return buildExpectedQueryEntries(expectedQuery).filter(([key, value]) => url.searchParams.get(key) !== value);
}

export function resolveNextRedirectDigestUrl(payloadText, baseUrl) {
  const match = payloadText.match(/NEXT_REDIRECT;(?:replace|push);([^;]+);\d+;/);
  if (!match?.[1]) {
    return null;
  }

  const normalizedUrl = match[1]
    .replace(/\\\\u0026/g, '&')
    .replace(/\\u0026/g, '&');
  try {
    return new URL(normalizedUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function assertRouteLoads(baseUrl, routePath, { expectedPath = null, expectedQuery = null } = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    cache: 'no-store',
    redirect: 'follow'
  });
  if (!response.ok) {
    throw new Error(`GET ${routePath} failed with HTTP ${response.status}`);
  }

  const payloadText = await response.text();
  let finalUrl = new URL(response.url);
  if (expectedPath && finalUrl.pathname !== expectedPath) {
    const redirectDigestUrl = resolveNextRedirectDigestUrl(payloadText, baseUrl);
    if (redirectDigestUrl) {
      finalUrl = new URL(redirectDigestUrl);
    }
  }

  if (expectedPath && finalUrl.pathname !== expectedPath) {
    throw new Error(`GET ${routePath} resolved to unexpected path ${finalUrl.pathname}; expected ${expectedPath}`);
  }

  const mismatches = expectedQuery ? findMismatchedQueryEntries(finalUrl, expectedQuery) : [];
  if (mismatches.length > 0) {
    const mismatchText = mismatches.map(([key, value]) => `${key}=${value}`).join(', ');
    throw new Error(`GET ${routePath} resolved with unexpected query values: ${mismatchText}`);
  }

  return {
    status: response.status,
    finalUrl: finalUrl.toString()
  };
}

export async function loginWithPassword(baseUrl, identifier, credential, type = 0) {
  const loginMessage = await requestMessage(baseUrl, '/api/account/auth/form', {
    method: 'POST',
    body: {
      type,
      identifier,
      credential
    }
  });

  const data = requireMessageData(loginMessage, 'Login');
  if (!data?.token || !data?.refreshToken) {
    throw new Error('Login succeeded without access and refresh tokens.');
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
    role: data.role ?? null
  };
}

export async function refreshWithToken(baseUrl, refreshToken) {
  const message = await requestMessage(baseUrl, '/api/account/auth/refresh', {
    method: 'POST',
    body: {
      token: refreshToken
    }
  });

  const data = requireMessageData(message, 'Refresh token');
  if (!data?.token) {
    throw new Error('Refresh succeeded without a replacement access token.');
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken ?? refreshToken
  };
}
