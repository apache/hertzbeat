type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

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
    message
  };
}
