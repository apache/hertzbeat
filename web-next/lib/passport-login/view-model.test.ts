import { describe, expect, it, vi } from 'vitest';
import { buildLoginFeatureCards, buildLoginNotice, shouldBlockDefaultPasswordSubmit, shouldWarnDefaultPassword, validateCredentialLoginDraft } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

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

  it('validates the Angular credential-login required fields before submit', () => {
    expect(validateCredentialLoginDraft('', 'custom', enT)).toEqual({
      field: 'identifier',
      message: 'Please enter your username'
    });
    expect(validateCredentialLoginDraft('ops-admin', '', enT)).toEqual({
      field: 'credential',
      message: 'Please enter password'
    });
    expect(validateCredentialLoginDraft(' ops-admin ', ' custom ', enT)).toBeNull();
    expect(validateCredentialLoginDraft('   ', 'custom', enT)).toBeNull();
    expect(validateCredentialLoginDraft('ops-admin', '   ', enT)).toBeNull();
  });

  it('builds the login feature cards', () => {
    expect(buildLoginFeatureCards(t)).toEqual([
      { title: t('passport.login.card.entry.title'), copy: t('passport.login.card.entry.copy') },
      { title: t('passport.login.card.shell.title'), copy: t('passport.login.card.shell.copy') },
      { title: t('passport.login.card.auth.title'), copy: t('passport.login.card.auth.copy') }
    ]);
  });

  it('builds the warning or session notice', () => {
    expect(buildLoginNotice(true, t)).toEqual({
      kind: 'warning',
      copy: t('app.login.need-change-password'),
      href: 'https://hertzbeat.apache.org/docs/start/account-modify'
    });

    expect(buildLoginNotice(false, t)).toEqual({
      kind: 'session',
      copy: t('passport.login.session-copy')
    });
  });

  it('builds the English session notice without localized fallback copy', () => {
    const notice = buildLoginNotice(false, enT);

    expect(notice).toEqual({
      kind: 'session',
      copy: 'After login, HertzBeat will restore the current workspace session and try to refresh tokens when needed.'
    });
    expect(notice.copy).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
