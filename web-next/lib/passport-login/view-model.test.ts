import { describe, expect, it, vi } from 'vitest';
import { buildLoginFeatureCards, buildLoginNotice, shouldBlockDefaultPasswordSubmit, shouldWarnDefaultPassword } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('passport login view model', () => {
  it('detects the default password warning condition', () => {
    expect(shouldWarnDefaultPassword('hertzbeat')).toBe(true);
    expect(shouldWarnDefaultPassword('custom')).toBe(false);
  });

  it('blocks the first submit when the default password still needs acknowledgement', () => {
    expect(shouldBlockDefaultPasswordSubmit(false, 'hertzbeat')).toBe(true);
    expect(shouldBlockDefaultPasswordSubmit(true, 'hertzbeat')).toBe(false);
    expect(shouldBlockDefaultPasswordSubmit(false, 'custom')).toBe(false);
  });

  it('builds the login feature cards', () => {
    expect(buildLoginFeatureCards(t)).toEqual([
      { title: '运维入口', copy: '登录后继续查看资源、实体、遥测数据和告警。' },
      { title: '私有化部署', copy: '在 HertzBeat 工作台管理内网采集、模板和状态页。' },
      { title: '安全访问', copy: '验证账号后再进入告警处理、通知和系统设置。' }
    ]);
  });

  it('builds the warning or session notice', () => {
    expect(buildLoginNotice(true, t)).toEqual({
      kind: 'warning',
      copy: '当前使用默认密码，建议登录后尽快修改。',
      href: 'https://hertzbeat.apache.org/docs/start/account-modify'
    });

    expect(buildLoginNotice(false, t)).toEqual({
      kind: 'session',
      copy: '登录成功后会自动恢复当前工作台会话，并在需要时尝试刷新令牌。'
    });
  });
});
