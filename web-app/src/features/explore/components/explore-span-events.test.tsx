/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
