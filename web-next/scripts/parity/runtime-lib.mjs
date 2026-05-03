export const DEFAULT_PARITY_RUNTIME_TARGETS = Object.freeze({
  backend: {
    readyPath: '/api/config/system',
    acceptableStatuses: [200, 401],
    probeTimeoutMs: 12000
  },
  next: {
    readyPath: '/overview',
    acceptableStatuses: [200],
    probeTimeoutMs: 3000
  },
  angular: {
    readyPath: '/overview',
    acceptableStatuses: [200],
    probeTimeoutMs: 3000
  }
});

export function getParityRuntimeTargets({
  nextBaseUrl = 'http://127.0.0.1:4200',
  angularBaseUrl = 'http://127.0.0.1:4301',
  backendBaseUrl = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1157'
} = {}) {
  return {
    backend: {
      name: 'backend-1157',
      baseUrl: backendBaseUrl,
      port: 1157,
      ...DEFAULT_PARITY_RUNTIME_TARGETS.backend
    },
    next: {
      name: 'next-4200',
      baseUrl: nextBaseUrl,
      port: 4200,
      ...DEFAULT_PARITY_RUNTIME_TARGETS.next
    },
    angular: {
      name: 'angular-4301',
      baseUrl: angularBaseUrl,
      port: 4301,
      ...DEFAULT_PARITY_RUNTIME_TARGETS.angular
    }
  };
}

export function isAcceptedProbeResult({
  baseUrl,
  readyPath,
  acceptableStatuses,
  status,
  finalUrl
}) {
  if (!acceptableStatuses.includes(status)) {
    return false;
  }

  if (!finalUrl) {
    return true;
  }

  const expectedUrl = new URL(readyPath, baseUrl);
  const resolvedUrl = new URL(finalUrl, baseUrl);

  return expectedUrl.origin === resolvedUrl.origin && expectedUrl.pathname === resolvedUrl.pathname;
}
