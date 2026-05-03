import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { interpolate } from './i18n';

describe('interpolate', () => {
  it('replaces double-brace placeholders', () => {
    expect(interpolate('Monitor {{name}} is {{state}}', { name: 'api', state: 'up' })).toBe('Monitor api is up');
  });

  it('replaces single-brace placeholders from Angular locale bundles', () => {
    expect(interpolate('Platform setup {percent}%', { percent: 83 })).toBe('Platform setup 83%');
  });

  it('drops placeholders when the value is missing', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello ');
  });

  it('keeps the zh-CN setup progress copy aligned with the Angular header baseline', () => {
    const zhCnMessages = JSON.parse(
      readFileSync(path.join(process.cwd(), '..', 'web-app', 'src', 'assets', 'i18n', 'zh-CN.json'), 'utf-8')
    ) as Record<string, string>;

    expect(zhCnMessages['layout.setup.progress.headline']).toBe('你已完成 {percent}% 的平台配置');
  });
});
