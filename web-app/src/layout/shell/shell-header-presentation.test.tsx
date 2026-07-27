/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShellHeaderActions } from './shell-header-presentation';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${Object.values(options).join('|')}` : key) as TFunction;

describe('ShellHeaderActions account menu', () => {
  afterEach(cleanup);

  it('keeps Lock in the account menu and dispatches the selected action only', async () => {
    const onLock = vi.fn();
    const onLogout = vi.fn();
    render(
      <ShellHeaderActions
        accountName="operator"
        alertNotifications={{
          count: { kind: 'ready', total: 0 },
          list: { kind: 'empty' },
          sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
          toggleSound: vi.fn()
        }}
        fullscreen={{ available: true, active: false, busy: false }}
        loggingOut={false}
        showRefresh={false}
        t={t}
        onRefresh={vi.fn()}
        onOpenAlerts={vi.fn()}
        onOpenSettings={vi.fn()}
        onToggleTheme={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onChangeLanguage={vi.fn()}
        onLock={onLock}
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.user' }));
    fireEvent.click(await screen.findByText('shell.account.lock'));
    expect(onLock).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('restores the established fullscreen action and changes its accessible label after entry', () => {
    const onToggleFullscreen = vi.fn();
    const props = {
      accountName: 'operator',
      alertNotifications: {
        count: { kind: 'ready', total: 0 } as const,
        list: { kind: 'empty' } as const,
        sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null } as const,
        toggleSound: vi.fn()
      },
      loggingOut: false,
      showRefresh: false,
      t,
      onRefresh: vi.fn(),
      onOpenAlerts: vi.fn(),
      onOpenSettings: vi.fn(),
      onToggleTheme: vi.fn(),
      onToggleFullscreen,
      onChangeLanguage: vi.fn(),
      onLock: vi.fn(),
      onLogout: vi.fn()
    };
    const { rerender } = render(
      <ShellHeaderActions {...props} fullscreen={{ available: true, active: false, busy: false }} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.fullscreenEnter' }));
    expect(onToggleFullscreen).toHaveBeenCalledOnce();

    rerender(<ShellHeaderActions {...props} fullscreen={{ available: true, active: true, busy: false }} />);
    expect(screen.getByRole('button', { name: 'shell.actions.fullscreenExit' })).toBeInTheDocument();
  });
});
