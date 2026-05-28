import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Select } from './select';

describe('Select', () => {
  it('renders the shared cold-matte native select owner instead of the system default chrome', () => {
    const html = renderToStaticMarkup(
      <Select defaultValue="zh-CN" aria-label="语言" defaultOpen>
        <option value="zh-CN">简体中文</option>
        <option value="en-US">English</option>
      </Select>
    );
    const source = readFileSync(resolve(process.cwd(), 'components/ui/select.tsx'), 'utf8');
    const globalCss = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

    expect(html).toContain('data-cold-select-owner="cold-custom-select"');
    expect(html).toContain('data-cold-select-control="custom-trigger"');
    expect(html).toContain('data-cold-select-control="hidden-native"');
    expect(html).toContain('data-cold-select-control="form-value"');
    expect(html).toContain('data-cold-select-listbox="custom-menu"');
    expect(html).toContain('data-cold-select-layer="viewport-fixed"');
    expect(html).toContain('data-cold-select-option="selected"');
    expect(html).toContain('data-cold-select-icon="chevron"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('appearance-none');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('pr-8');
    expect(html).not.toContain('rounded-[2px]');
    expect(source).toContain('coldSelectTriggerClassName');
    expect(source).toContain("position: 'fixed'");
    expect(source).toContain("import { createPortal } from 'react-dom'");
    expect(source).toContain("data-cold-select-portal={canUsePortal ? 'body-layer' : 'server-inline-fallback'}");
    expect(source).toContain('createPortal(listbox, document.body)');
    expect(source).not.toContain('absolute left-0 top-[calc(100%+4px)]');
    expect(source).not.toContain('className={coldSelectListboxClassName}');
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain('name={disabled ? undefined : name}');
    expect(source).toContain('disabled');
    expect(globalCss).toContain('select:not([multiple])');
    expect(globalCss).toContain('-webkit-appearance: none');
  });

  it('keeps runtime dropdowns behind the shared cold custom select owner', () => {
    const sourceRoots = ['app', 'components'].map(root => resolve(process.cwd(), root));
    const runtimeFiles = sourceRoots.flatMap(root => walkSourceFiles(root));
    const directNativeSelectFiles = runtimeFiles
      .filter(file => !file.endsWith('components/ui/select.tsx'))
      .filter(file => !file.endsWith('.test.tsx'))
      .filter(file => !file.endsWith('.spec.tsx'))
      .filter(file => readFileSync(file, 'utf8').includes('<select'))
      .map(file => relative(process.cwd(), file));

    expect(directNativeSelectFiles).toEqual([]);
  });

  it('renders the catalog-backed empty trigger label when no option is available', () => {
    const html = renderToStaticMarkup(<Select aria-label="empty select" />);

    expect(html).toContain('data-cold-select-control="custom-trigger"');
    expect(html).toContain('None');
    expect(html).not.toContain('>-<');
  });

  it('can render the Angular searchable dropdown affordance for settings timezones', () => {
    const html = renderToStaticMarkup(
      <Select searchable searchPlaceholder="Search timezone" defaultOpen defaultValue="Asia/Shanghai" aria-label="Timezone">
        <option value="Asia/Shanghai">Asia/Shanghai (+08:00) Shanghai</option>
        <option value="UTC">UTC (+00:00) UTC</option>
      </Select>
    );
    const source = readFileSync(resolve(process.cwd(), 'components/ui/select.tsx'), 'utf8');

    expect(html).toContain('data-cold-select-search="angular-nz-show-search"');
    expect(html).toContain('type="search"');
    expect(html).toContain('placeholder="Search timezone"');
    expect(html).toContain('data-cold-select-listbox="custom-menu"');
    expect(source).toContain('searchable?: boolean');
    expect(source).toContain('data-cold-select-empty="search-empty"');
  });
});

function walkSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') return [];
      return walkSourceFiles(path);
    }
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [path];
  });
}
