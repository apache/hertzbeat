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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { afterEach, expect, it, vi } from 'vitest';

import { InstrumentationAccessTokenModal } from './instrumentation-access-token-modal';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

it('characterizes open expiration Select consuming Escape before the token modal closes', async () => {
  const onClose = vi.fn();
  const onGenerate = vi.fn();
  const onDraft = vi.fn();
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <InstrumentationAccessTokenModal
        draft={{ name: 'Audit unsaved token draft', expireSeconds: 2_592_000, scope: 'otlp-ingest' }}
        tokenGenerating={false}
        tokenError={false}
        onClose={onClose}
        onGenerate={onGenerate}
        onDraft={onDraft}
      />
    </ConfigProvider>
  );
  const select = screen.getByRole('combobox', { name: 'instrumentation.token.expires' });
  fireEvent.mouseDown(select);
  await waitFor(() => expect(select).toHaveAttribute('aria-expanded', 'true'));
  fireEvent.keyDown(select, { key: 'Escape', keyCode: 27 });
  await waitFor(() => expect(select).toHaveAttribute('aria-expanded', 'false'));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'instrumentation.token.generateTitle' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'instrumentation.token.name' })).toHaveValue('Audit unsaved token draft');
  expect(onGenerate).not.toHaveBeenCalled();
  expect(onDraft).not.toHaveBeenCalled();

  // Observe the existing parent-close behavior separately; this does not approve dirty-draft discard semantics.
  fireEvent.keyDown(select, { key: 'Escape', keyCode: 27 });
  expect(onClose).toHaveBeenCalledOnce();
  expect(onGenerate).not.toHaveBeenCalled();
});
