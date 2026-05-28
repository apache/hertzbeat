import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SearchRow } from './search-row';

describe('SearchRow', () => {
  it('renders the shared cold search row with a direct input and detached actions', () => {
    const html = renderToStaticMarkup(
      <SearchRow
        value="weekday"
        placeholder="策略名称"
        searchLabel="搜索"
        clearLabel="清除"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-action="clear"');
    expect(html).toContain('<form');
    expect(html).toContain('type="search"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('w-[320px]');
    expect(html).toContain('w-fit');
    expect(html).toContain('max-w-full');
    expect(html).not.toContain('data-cold-search-input-shell=');
    expect(html.indexOf('data-cold-search-input="fixed-width-direct"')).toBeLessThan(html.indexOf('data-cold-search-action="submit"'));
    expect(html.indexOf('data-cold-search-action="submit"')).toBeLessThan(html.indexOf('data-cold-search-action="clear"'));
  });

  it('can render shared filter controls before the detached search action', () => {
    const html = renderToStaticMarkup(
      <SearchRow
        value="checkout"
        placeholder="搜索告警"
        searchLabel="搜索"
        clearLabel="清除"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        filters={<select data-test-filter="status"><option>告警状态</option></select>}
      />
    );

    expect(html).toContain('data-cold-search-filter-slot="inline-before-submit"');
    expect(html).toContain('data-test-filter="status"');
    expect(html.indexOf('data-cold-search-input="fixed-width-direct"')).toBeLessThan(
      html.indexOf('data-cold-search-filter-slot="inline-before-submit"')
    );
    expect(html.indexOf('data-cold-search-filter-slot="inline-before-submit"')).toBeLessThan(
      html.indexOf('data-cold-search-action="submit"')
    );
  });

  it('uses runtime defaults for action labels when callers omit shared copy', () => {
    const html = renderToStaticMarkup(
      <SearchRow
        value="weekday"
        placeholder="Policy name"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-action="clear"');
    expect(html).toContain('Search');
    expect(html).toContain('Clear');
  });
});
