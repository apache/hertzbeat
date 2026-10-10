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
import { useRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/collector-deploy-api', () => ({
  CollectorDeployContractError: class extends Error {},
  generateCollectorDeployInfo: vi.fn()
}));

import { generateCollectorDeployInfo } from '../api/collector-deploy-api';
import { useCollectorDeployController } from '../controller/use-collector-deploy-controller';
import { CollectorDeployDialog } from './collector-deploy-dialog';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

function Harness({ closeEffect = 'none' }: { closeEffect?: 'none' | 'focus' | 'navigate' | 'remove' }) {
  const deploy = useCollectorDeployController({ canWrite: true });
  const trigger = useRef<HTMLButtonElement>(null);
  const fallback = useRef<HTMLButtonElement>(null);
  const other = useRef<HTMLButtonElement>(null);
  const [showTrigger, setShowTrigger] = useState(true);
  const cancel = () => {
    deploy.cancel();
    if (closeEffect === 'focus') other.current?.focus();
    if (closeEffect === 'navigate') window.history.pushState(null, '', '/other-route');
    if (closeEffect === 'remove') setShowTrigger(false);
  };
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      {showTrigger && (
        <button ref={trigger} onClick={deploy.open}>
          Launch
        </button>
      )}
      <button ref={fallback}>Search</button>
      <button ref={other}>Other</button>
      <CollectorDeployDialog
        state={deploy.state}
        onSubmit={name => void deploy.submit(name)}
        onCancel={cancel}
        onClose={cancel}
        returnFocusRef={trigger}
        fallbackFocusRef={fallback}
      />
    </ConfigProvider>
  );
}

function open() {
  const trigger = screen.getByRole('button', { name: 'Launch' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

async function closed() {
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(generateCollectorDeployInfo).not.toHaveBeenCalled();
}

it.each(['Escape', 'Cancel', 'Close'])(
  'returns focus after %s without generating deployment information',
  async action => {
    render(<Harness />);
    const trigger = open();
    const input = screen.getByRole('textbox');
    input.focus();
    if (action === 'Escape') fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    else fireEvent.click(screen.getByRole('button', { name: action === 'Cancel' ? 'common.cancel' : 'Close' }));
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  }
);

it('does not take focus from a control deliberately focused during dismissal', async () => {
  render(<Harness closeEffect="focus" />);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  await closed();
  expect(screen.getByRole('button', { name: 'Other' })).toHaveFocus();
});

it('does not restore the launch button after navigation', async () => {
  render(<Harness closeEffect="navigate" />);
  const trigger = open();
  screen.getByRole('textbox').focus();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  await closed();
  expect(trigger).not.toHaveFocus();
});

it('uses the search fallback only when the launch button has disappeared', async () => {
  render(<Harness closeEffect="remove" />);
  open();
  screen.getByRole('textbox').focus();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  await closed();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Search' })).toHaveFocus());
});

it('reopens with an empty draft and no previous validation state', async () => {
  render(<Harness />);
  open();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
  await waitFor(() => expect(screen.getByText('collectors.deploy.required')).toBeVisible());
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  await closed();
  open();
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.queryByText('collectors.deploy.required')).not.toBeInTheDocument();
  expect(generateCollectorDeployInfo).not.toHaveBeenCalled();
});
