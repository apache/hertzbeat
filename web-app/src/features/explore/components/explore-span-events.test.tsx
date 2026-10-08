/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, cleanup } from '@testing-library/react';
import { beforeAll, afterEach, it, expect } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { SpanEvents } from './explore-span-events';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('renders exception evidence as text with exact timestamp and dropped attribute warning', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <SpanEvents
        events={[
          {
            name: 'exception',
            timeUnixNano: '1750000000000000123',
            attributes: {
              'exception.message': '<script>not executable</script>',
              'exception.stacktrace': 'Error: failed\n  at checkout'
            },
            droppedAttributesCount: 2
          }
        ]}
      />
    </I18nextProvider>
  );
  expect(screen.getByText('<script>not executable</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('time')).toHaveAttribute('data-time-unix-nano', '1750000000000000123');
  expect(screen.getByRole('status')).toHaveTextContent('2');
});
it('does not invent events for empty evidence', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <SpanEvents events={[]} />
    </I18nextProvider>
  );
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('exploreInvestigation.trace.eventDetails.empty'));
  expect(document.querySelector('details')).toBeNull();
});
