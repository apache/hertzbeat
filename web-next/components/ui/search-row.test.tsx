// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchRow } from './search-row';

let interactionContainer: HTMLDivElement | null = null;
let interactionRoot: Root | null = null;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  if (interactionRoot && interactionContainer) {
    act(() => {
      interactionRoot?.unmount();
    });
    interactionRoot = null;
    interactionContainer.remove();
    interactionContainer = null;
  }
});

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
    expect(html).toContain('data-hz-search-enter-submit="direct-input"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-hz-search-action="clear"');
    expect(html).toContain('<form');
    expect(html).toContain('name="search"');
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

  it('submits the current direct input value when Enter is pressed', async () => {
    const onSearch = vi.fn();
    function SearchRowHarness() {
      const [value, setValue] = React.useState('');
      return (
        <SearchRow
          value={value}
          placeholder="Entity name"
          searchLabel="Search"
          onValueChange={setValue}
          onSearch={onSearch}
        />
      );
    }

    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<SearchRowHarness />);
      await Promise.resolve();
    });

    const input = interactionContainer.querySelector('input[data-hz-search-input="fixed-width-direct"]') as HTMLInputElement | null;
    const form = input?.closest('form');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      valueSetter?.call(input, 'checkout-api');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
      await Promise.resolve();
    });

    expect(onSearch).toHaveBeenCalledWith('checkout-api');
  });
});
