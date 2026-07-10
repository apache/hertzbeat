type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const BACKEND_UNAVAILABLE_MESSAGE = 'Backend service unavailable. Please retry after the backend service is restored.';

function resolveWorkbenchErrorMessage(message: string, t: Translator) {
  if (message === BACKEND_UNAVAILABLE_MESSAGE || message.includes('Backend service unavailable.') || message.includes('API request failed: 503')) {
    return t('common.api.backend-unavailable');
  }
  return message;
}

export function resolveWorkbenchError(error: unknown, hasAuthorizationToken: boolean, t: Translator): {
  redirectToLogin: boolean;
  message: string | null;
} {
  const message = error instanceof Error ? error.message : t('common.error.unknown');

  if (message.includes('401')) {
    return { redirectToLogin: true, message: null };
  }

  return {
    redirectToLogin: false,
    message: resolveWorkbenchErrorMessage(message, t)
  };
}
