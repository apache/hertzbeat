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
