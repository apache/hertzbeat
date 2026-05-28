type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildLockFacts(t: Translator) {
  return [
    { label: t('common.workspace'), value: 'passport/lock' },
    { label: t('common.status'), value: t('passport.lock.status.interactive') },
    { label: t('common.next-step'), value: t('passport.lock.next-step') }
  ];
}

export function validateUnlockPassword(password: string, t: Translator) {
  if (password.length === 0) {
    return t('passport.lock.error.required');
  }
  return null;
}
