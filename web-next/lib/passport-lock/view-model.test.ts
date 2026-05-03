import { describe, expect, it, vi } from 'vitest';
import { buildLockFacts, validateUnlockPassword } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('passport lock view model', () => {
  it('builds lock page facts', () => {
    expect(buildLockFacts(t)).toEqual([
      { label: '工作区', value: 'passport/lock' },
      { label: '状态', value: 'interactive' },
      { label: '下一步', value: 'wire unlock validation if needed' }
    ]);
  });

  it('requires a non-empty password', () => {
    expect(validateUnlockPassword('', t)).toBe('请输入密码');
    expect(validateUnlockPassword('   ', t)).toBe('请输入密码');
    expect(validateUnlockPassword('secret', t)).toBeNull();
  });
});
