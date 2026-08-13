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

import { supportedLocales } from '@/core/i18n/locale';

import { ShellBrand, ShellHeaderActions } from './shell-header-presentation';

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
          sound: { kind: 'ready', canToggle: true, muted: true, saving: false, permission: 'default', failure: null },
          previewOpen: false,
          setPreviewOpen: vi.fn(),
          toggleSound: vi.fn()
        }}
        fullscreen={{ available: true, active: false, busy: false }}
        loggingOut={false}
        activeLocale="en-US"
        t={t}
        onOpenAlerts={vi.fn()}
        onOpenSettings={vi.fn()}
        theme="dark"
        onThemeChange={vi.fn()}
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
        sound: {
          kind: 'ready',
          canToggle: true,
          muted: true,
          saving: false,
          permission: 'default',
          failure: null
        } as const,
        previewOpen: false,
        setPreviewOpen: vi.fn(),
        toggleSound: vi.fn()
      },
      loggingOut: false,
      activeLocale: 'en-US' as const,
      t,
      onOpenAlerts: vi.fn(),
      onOpenSettings: vi.fn(),
      theme: 'dark' as const,
      onThemeChange: vi.fn(),
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

  it('renders the runtime theme as an explicit light and dark switch', () => {
    const onThemeChange = vi.fn();
    const props = createProps({ onThemeChange });
    const { rerender } = render(<ShellHeaderActions {...props} theme="compact" />);

    const darkSwitch = screen.getByRole('switch', { name: 'shell.actions.useLightTheme' });
    expect(darkSwitch).toBeChecked();
    fireEvent.click(darkSwitch);
    expect(onThemeChange).toHaveBeenCalledWith(false);

    rerender(<ShellHeaderActions {...props} theme="default" />);
    expect(screen.getByRole('switch', { name: 'shell.actions.useDarkTheme' })).not.toBeChecked();
  });

  it('uses the official full wordmark in both themes without collapsing the brand', () => {
    const { rerender } = render(<ShellBrand theme="default" />);

    expect(screen.getByRole('img', { name: 'HertzBeat' })).toHaveAttribute('src', '/assets/hertzbeat-brand.svg');
    expect(screen.getByRole('img', { name: 'HertzBeat' })).toHaveAttribute('width', '144');
    expect(screen.getByRole('img', { name: 'HertzBeat' })).toHaveAttribute('height', '36');

    rerender(<ShellBrand theme="dark" />);
    expect(screen.getByRole('img', { name: 'HertzBeat' })).toHaveAttribute('src', '/assets/hertzbeat-brand-white.svg');
  });

  it('opens every supported locale and dispatches the selected locale explicitly', async () => {
    const onChangeLanguage = vi.fn();
    render(<ShellHeaderActions {...createProps({ activeLocale: 'en-US', onChangeLanguage })} />);

    expect(screen.queryByRole('button', { name: 'shell.actions.refresh' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.language' }));
    for (const locale of supportedLocales) {
      expect(await screen.findByText(`systemConfig.locale.${locale.replace('-', '_')}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText('systemConfig.locale.ja_JP'));
    expect(onChangeLanguage).toHaveBeenCalledWith('ja-JP');
  });

  it('opens a context-bound investigation from an operational page', () => {
    const onOpen = vi.fn();
    render(<ShellHeaderActions {...createProps()} investigation={{ label: 'Investigate this view', onOpen }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Investigate this view' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

function createProps(overrides: Partial<React.ComponentProps<typeof ShellHeaderActions>> = {}) {
  return {
    accountName: 'operator',
    alertNotifications: {
      count: { kind: 'ready', total: 0 } as const,
      list: { kind: 'empty' } as const,
      sound: {
        kind: 'ready',
        canToggle: true,
        muted: true,
        saving: false,
        permission: 'default',
        failure: null
      } as const,
      previewOpen: false,
      setPreviewOpen: vi.fn(),
      toggleSound: vi.fn()
    },
    fullscreen: { available: false, active: false, busy: false },
    loggingOut: false,
    activeLocale: 'en-US' as const,
    t,
    theme: 'dark' as const,
    onOpenAlerts: vi.fn(),
    onOpenSettings: vi.fn(),
    onThemeChange: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onChangeLanguage: vi.fn(),
    onLock: vi.fn(),
    onLogout: vi.fn(),
    ...overrides
  };
}
