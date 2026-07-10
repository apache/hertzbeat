type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function shouldWarnDefaultPassword(credential: string) {
  return credential === 'hertzbeat';
}

export function shouldBlockDefaultPasswordSubmit(needUpdatePassword: boolean, credential: string) {
  return !needUpdatePassword && shouldWarnDefaultPassword(credential);
}

export function validateCredentialLoginDraft(identifier: string, credential: string, t: Translator) {
  if (identifier.length === 0) {
    return {
      field: 'identifier' as const,
      message: t('app.login.message-need-identifier')
    };
  }

  if (credential.length === 0) {
    return {
      field: 'credential' as const,
      message: t('app.login.message-need-credential')
    };
  }

  return null;
}

export function normalizeCredentialLoginError(message: string, t: Translator) {
  const normalized = message.trim().toLowerCase();
  if (
    normalized === 'incorrect account or password' ||
    normalized === 'username or password is incorrect or token expired'
  ) {
    return t('passport.login.error.generic');
  }

  return message;
}

export function resolveLoginReturnTargetLabel(redirectTarget: string, t: Translator) {
  let pathname = redirectTarget;
  try {
    pathname = new URL(redirectTarget, 'http://hertzbeat.local').pathname;
  } catch {
    pathname = redirectTarget.split('?')[0] || redirectTarget;
  }

  if (pathname === '/entities') {
    return t('passport.login.return-target.entities');
  }
  if (pathname === '/entities/discovery') {
    return t('passport.login.return-target.entity-discovery');
  }
  if (pathname === '/entities/new') {
    return t('passport.login.return-target.entity-new');
  }
  if (pathname === '/entities/import') {
    return t('passport.login.return-target.entity-import');
  }
  if (/^\/entities\/[^/]+\/edit$/.test(pathname)) {
    return t('passport.login.return-target.entity-edit');
  }
  if (/^\/entities\/[^/]+\/definition$/.test(pathname)) {
    return t('passport.login.return-target.entity-definition');
  }
  if (/^\/entities\/[^/]+$/.test(pathname)) {
    return t('passport.login.return-target.entity-detail');
  }

  return t('passport.login.return-target.workbench');
}

export function buildLoginFeatureCards(t: Translator) {
  return [
    {
      title: t('passport.login.card.entry.title'),
      copy: t('passport.login.card.entry.copy')
    },
    {
      title: t('passport.login.card.shell.title'),
      copy: t('passport.login.card.shell.copy')
    },
    {
      title: t('passport.login.card.auth.title'),
      copy: t('passport.login.card.auth.copy')
    }
  ];
}

export function buildLoginNotice(needUpdatePassword: boolean, t: Translator) {
  if (needUpdatePassword) {
    return {
      kind: 'warning' as const,
      copy: t('app.login.need-change-password'),
      href: 'https://hertzbeat.apache.org/docs/start/account-modify'
    };
  }

  return {
    kind: 'session' as const,
    copy: t('passport.login.session-copy')
  };
}
