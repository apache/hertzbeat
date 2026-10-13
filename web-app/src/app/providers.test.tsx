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

import { Button, theme } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import { initializeI18n } from '@/core/i18n/i18n';
import { PassportPageFrame } from '@/features/auth/pages/passport-page-frame';

import { AppProviders } from './providers';

function ThemeProbe() {
  const { theme: runtimeTheme, setTheme } = useRuntimeTheme();
  const { token } = theme.useToken();

  return (
    <div data-testid="probe">
      <output data-testid="theme">{runtimeTheme}</output>
      <output data-testid="background">{token.colorBgBase}</output>
      <output data-testid="control-height">{token.controlHeight}</output>
      <Button onClick={() => setTheme('default')}>default</Button>
      <Button onClick={() => setTheme('compact')}>compact</Button>
    </div>
  );
}

function expectAntVariableScope() {
  const antApp = screen.getByTestId('probe').closest('.ant-app');
  expect(antApp).not.toBeNull();
  expect(antApp?.className).toMatch(/(?:^|\s)css-var-[^\s]+/);
}

describe('AppProviders theme contract', () => {
  afterEach(cleanup);

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await initializeI18n();
  });

  it('publishes Ant Design variables and keeps them enabled through runtime theme changes', async () => {
    render(
      <AppProviders>
        <ThemeProbe />
      </AppProviders>
    );

    await screen.findByTestId('probe');
    expectAntVariableScope();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent('#0d0f14');
    expect(screen.getByTestId('control-height')).toHaveTextContent('32');

    fireEvent.click(screen.getByRole('button', { name: 'default' }));
    expectAntVariableScope();
    expect(screen.getByTestId('theme')).toHaveTextContent('default');
    expect(screen.getByTestId('background')).toHaveTextContent('#f5f6f8');
    expect(screen.getByTestId('control-height')).toHaveTextContent('32');
    expect(document.documentElement.dataset.theme).toBe('default');
    expect(localStorage.getItem('hertzbeat.theme')).toBe('default');

    fireEvent.click(screen.getByRole('button', { name: 'compact' }));
    expectAntVariableScope();
    expect(screen.getByTestId('theme')).toHaveTextContent('compact');
    expect(screen.getByTestId('background')).toHaveTextContent('#0d0f14');
    expect(screen.getByTestId('control-height')).toHaveTextContent('28');
  });

  it('restores a persisted light preference when providers mount again', async () => {
    localStorage.setItem('hertzbeat.theme', 'default');

    render(
      <AppProviders>
        <ThemeProbe />
      </AppProviders>
    );

    await screen.findByTestId('probe');
    expect(screen.getByTestId('theme')).toHaveTextContent('default');
    expect(screen.getByTestId('background')).toHaveTextContent('#f5f6f8');
  });

  it('keeps passport content light without changing the signed-in runtime preference', async () => {
    localStorage.setItem('hertzbeat.theme', 'dark');

    render(
      <AppProviders>
        <PassportPageFrame>
          <ThemeProbe />
        </PassportPageFrame>
      </AppProviders>
    );

    await screen.findByTestId('probe');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent('#f5f6f8');
    expect(localStorage.getItem('hertzbeat.theme')).toBe('dark');
  });
});
