/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, theme } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import { initializeI18n } from '@/core/i18n/i18n';

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
    expect(screen.getByTestId('control-height')).toHaveTextContent('28');

    fireEvent.click(screen.getByRole('button', { name: 'default' }));
    expectAntVariableScope();
    expect(screen.getByTestId('theme')).toHaveTextContent('default');
    expect(screen.getByTestId('background')).toHaveTextContent('#f5f6f8');
    expect(screen.getByTestId('control-height')).toHaveTextContent('28');

    fireEvent.click(screen.getByRole('button', { name: 'compact' }));
    expectAntVariableScope();
    expect(screen.getByTestId('theme')).toHaveTextContent('compact');
    expect(screen.getByTestId('background')).toHaveTextContent('#0d0f14');
    expect(screen.getByTestId('control-height')).toHaveTextContent('24');
  });
});
