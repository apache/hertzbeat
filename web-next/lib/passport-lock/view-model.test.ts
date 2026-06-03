import { describe, expect, it, vi } from 'vitest';
import { buildLockFacts, validateUnlockPassword } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('passport lock view model', () => {
  it('builds lock page facts', () => {
    expect(buildLockFacts(t)).toEqual([
      { label: t('common.workspace'), value: 'passport/lock' },
      { label: t('common.status'), value: t('passport.lock.status.interactive') },
      { label: t('common.next-step'), value: t('passport.lock.next-step') }
    ]);
  });

  it('requires a non-empty password', () => {
    expect(validateUnlockPassword('', t)).toBe(t('passport.lock.error.required'));
    expect(validateUnlockPassword('   ', t)).toBeNull();
    expect(validateUnlockPassword('secret', t)).toBeNull();
  });
});
