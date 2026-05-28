import { describe, expect, it } from 'vitest';
import { isActiveRoute, isStandaloneRoute, shouldLoadHeaderState } from './app-frame-state';

describe('app frame state', () => {
  it('recognizes standalone routes', () => {
    expect(isStandaloneRoute('/login')).toBe(true);
    expect(isStandaloneRoute('/passport/login')).toBe(true);
    expect(isStandaloneRoute('/passport/lock')).toBe(true);
    expect(isStandaloneRoute('/status')).toBe(true);
    expect(isStandaloneRoute('/status/public')).toBe(true);
    expect(isStandaloneRoute('/exception/403')).toBe(true);
    expect(isStandaloneRoute('/exception/404')).toBe(true);
    expect(isStandaloneRoute('/exception/500')).toBe(false);
    expect(isStandaloneRoute('/overview')).toBe(false);
  });

  it('matches active routes consistently', () => {
    expect(isActiveRoute('/entities', '/entities')).toBe(true);
    expect(isActiveRoute('/entities/123', '/entities')).toBe(true);
    expect(isActiveRoute('/alert/setting', '/alert')).toBe(true);
    expect(isActiveRoute('/log/manage', '/trace/manage')).toBe(false);
  });

  it('skips header state loading on standalone routes', () => {
    expect(shouldLoadHeaderState('/passport/login')).toBe(false);
    expect(shouldLoadHeaderState('/passport/lock')).toBe(false);
    expect(shouldLoadHeaderState('/status')).toBe(false);
    expect(shouldLoadHeaderState('/exception/404')).toBe(false);
    expect(shouldLoadHeaderState('/overview')).toBe(true);
  });

  it('does not let app-frame setup polling compete with monitor CRUD interactions', () => {
    expect(shouldLoadHeaderState('/monitors')).toBe(false);
    expect(shouldLoadHeaderState('/monitors/new')).toBe(false);
    expect(shouldLoadHeaderState('/monitors/42')).toBe(false);
    expect(shouldLoadHeaderState('/monitors/42/edit')).toBe(false);
  });
});
