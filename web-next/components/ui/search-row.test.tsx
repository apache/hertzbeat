import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SearchRow } from './search-row';

describe('SearchRow', () => {
  it('renders the shared HertzBeat UI search row with a direct input and detached actions', () => {
    const html = renderToStaticMarkup(
      <SearchRow
        value="weekday"
        placeholder="Policy name"
        searchLabel="Search"
        clearLabel="Clear"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(html).toContain('data-hz-ui="search-row"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-layout="compact-detached-button"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-hz-search-action="clear"');
    expect(html).toContain('<form');
    expect(html).toContain('type="search"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('w-[320px]');
    expect(html).toContain('w-fit');
    expect(html).toContain('max-w-full');
    expect(html).not.toContain('data-hz-search-input-shell=');
    expect(html.indexOf('data-hz-search-input="fixed-width-direct"')).toBeLessThan(html.indexOf('data-hz-search-action="submit"'));
    expect(html.indexOf('data-hz-search-action="submit"')).toBeLessThan(html.indexOf('data-hz-search-action="clear"'));
  });

  it('can render shared filter controls before the detached search action', () => {
    const html = renderToStaticMarkup(
      <SearchRow
        value="checkout"
        placeholder="Search alerts"
        searchLabel="Search"
        clearLabel="Clear"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        filters={<select data-test-filter="status"><option>Alert status</option></select>}
      />
    );

    expect(html).toContain('data-hz-search-filter-slot="inline-before-submit"');
    expect(html).toContain('data-test-filter="status"');
    expect(html.indexOf('data-hz-search-input="fixed-width-direct"')).toBeLessThan(
      html.indexOf('data-hz-search-filter-slot="inline-before-submit"')
    );
    expect(html.indexOf('data-hz-search-filter-slot="inline-before-submit"')).toBeLessThan(
      html.indexOf('data-hz-search-action="submit"')
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

    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-hz-search-action="clear"');
    expect(html).toContain('Search');
    expect(html).toContain('Clear');
  });
});
