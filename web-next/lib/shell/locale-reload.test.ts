// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { HEADER_LOCALE_RELOAD_SPINNER_CLASS, HEADER_LOCALE_RELOAD_SPINNER_MARKER, showHeaderLocaleReloadSpinner } from './locale-reload';

describe('header locale reload spinner', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('matches the Angular header-i18n page-loading spinner contract and dedupes repeats', () => {
    showHeaderLocaleReloadSpinner();
    showHeaderLocaleReloadSpinner();

    const spinners = document.querySelectorAll(`[data-app-frame-locale-reload="${HEADER_LOCALE_RELOAD_SPINNER_MARKER}"]`);

    expect(spinners).toHaveLength(1);
    expect(spinners[0]?.getAttribute('class')).toBe(HEADER_LOCALE_RELOAD_SPINNER_CLASS);
    expect(spinners[0]?.innerHTML).toContain('ant-spin-dot ant-spin-dot-spin');
  });
});
