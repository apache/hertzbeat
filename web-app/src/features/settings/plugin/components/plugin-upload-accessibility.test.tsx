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

import { ConfigProvider } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { PluginUploadDialog } from './plugin-dialogs';
const actions = { name: vi.fn(), file: vi.fn(), enabled: vi.fn(), save: vi.fn(), cancel: vi.fn() };
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <button onClick={() => setOpen(true)}>Launch upload</button>
      <PluginUploadDialog
        upload={open ? { name: '', jarFile: null, enableStatus: true } : null}
        invalid={{ name: false, jarFile: false }}
        failure={null}
        busy={false}
        onName={actions.name}
        onFile={actions.file}
        onEnabled={actions.enabled}
        onSave={actions.save}
        onCancel={() => {
          actions.cancel();
          setOpen(false);
        }}
      />
    </ConfigProvider>
  );
}
function open() {
  const button = screen.getByRole('button', { name: 'Launch upload' });
  button.focus();
  fireEvent.click(button);
  return button;
}
it('names the input and switch from their visible labels and exposes a focusable file chooser button', async () => {
  render(<Harness />);
  open();
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'plugins.name' })).toBeVisible());
  expect(screen.getByRole('switch', { name: 'plugins.initialStatus' })).toBeVisible();
  const choose = screen.getByRole('button', { name: 'plugins.chooseJar' });
  expect(choose.tagName).toBe('BUTTON');
  expect(choose).toHaveAttribute('type', 'button');
  choose.focus();
  expect(choose).toHaveFocus();
  expect(actions.file).not.toHaveBeenCalled();
  expect(actions.save).not.toHaveBeenCalled();
});
it.each(['Enter', ' '])('routes %s button activation to the existing picker once without submission', key => {
  render(<Harness />);
  open();
  const choose = screen.getByRole('button', { name: 'plugins.chooseJar' });
  choose.focus();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const picker = vi.spyOn(input, 'click').mockImplementation(() => undefined);
  // jsdom does not synthesize the browser's native keyboard-generated click.
  fireEvent.keyDown(choose, { key });
  fireEvent.keyUp(choose, { key });
  fireEvent.click(choose);
  expect(picker).toHaveBeenCalledTimes(1);
  expect(actions.file).not.toHaveBeenCalled();
  expect(actions.save).not.toHaveBeenCalled();
  expect(actions.enabled).not.toHaveBeenCalled();
});
it.each(['Escape', 'Cancel', 'Close'])('retains launch focus restoration on %s dismissal', async action => {
  render(<Harness />);
  const launch = open();
  const choose = screen.getByRole('button', { name: 'plugins.chooseJar' });
  choose.focus();
  if (action === 'Escape') fireEvent.keyDown(choose, { key: 'Escape', keyCode: 27 });
  else fireEvent.click(screen.getByRole('button', { name: action === 'Cancel' ? 'common.cancel' : 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(launch).toHaveFocus());
  expect(actions.file).not.toHaveBeenCalled();
  expect(actions.save).not.toHaveBeenCalled();
});
