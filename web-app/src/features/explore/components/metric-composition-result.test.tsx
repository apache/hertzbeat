/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { MetricCompositionControls } from './metric-composition-result';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each([
  ['permission', false],
  ['overloaded', true]
] as const)('renders the specific %s reason without exposing server details', (kind, retryable) => {
  render(
    <I18nextProvider i18n={i18n}>
      <MetricCompositionControls
        view={{ mode: 'chart', hidden: [] }}
        onChange={vi.fn()}
        composition={{
          plan: { version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] },
          sources: [
            { refId: 'a', state: 'error', failure: { kind, retryable, messageKey: `perses.query.${kind}` }, series: [] }
          ],
          formulas: []
        }}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('checkbox')).toHaveAccessibleName(`a · ${i18n.t(`explore.perses.${kind}`)}`);
});
