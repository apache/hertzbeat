/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';

import { pluginParamTypes, type PluginParamDefine } from '../model/plugin-params-model';
import { PluginParamField } from './plugin-param-field';

const t = ((key: string) => key) as TFunction;

describe('PluginParamField', () => {
  afterEach(cleanup);
  it.each(pluginParamTypes)('renders the frozen %s field type', type => {
    const define: PluginParamDefine = {
      field: type,
      type,
      name: {},
      required: false,
      options: [{ label: 'One', value: 'one' }],
      hide: false,
      depend: {},
      ...(type === 'number' ? { range: '[1,10]' } : {})
    };
    const value =
      type === 'number'
        ? 2
        : type === 'boolean'
          ? false
          : type === 'checkbox' || type === 'array' || type === 'key-value' || type === 'metrics-field'
            ? []
            : '';
    const { container } = render(
      <PluginParamField
        define={define}
        value={value}
        {...(type === 'password' ? { password: { intent: 'CLEAR' as const, value: '', canKeep: false } } : {})}
        t={t}
        onChange={vi.fn()}
        onPassword={vi.fn()}
      />
    );
    expect(container.firstElementChild).not.toBeNull();
  });

  it('never offers KEEP for an unconfigured password', () => {
    const define: PluginParamDefine = {
      field: 'secret',
      type: 'password',
      name: {},
      required: false,
      options: [],
      hide: false,
      depend: {}
    };
    render(
      <PluginParamField
        define={define}
        value={undefined}
        password={{ intent: 'CLEAR', value: '', canKeep: false }}
        t={t}
        onChange={vi.fn()}
        onPassword={vi.fn()}
      />
    );
    expect(screen.queryByText('plugins.params.password.keep')).not.toBeInTheDocument();
  });

  it('shows a replacement input immediately for a required unconfigured password', () => {
    const define: PluginParamDefine = {
      field: 'secret',
      type: 'password',
      name: {},
      required: true,
      options: [],
      hide: false,
      depend: {}
    };
    render(
      <PluginParamField
        define={define}
        value={undefined}
        password={{ intent: 'REPLACE', value: '', canKeep: false }}
        t={t}
        onChange={vi.fn()}
        onPassword={vi.fn()}
      />
    );
    expect(document.querySelector('input[type="password"]')).toHaveValue('');
    expect(screen.queryByText('plugins.params.password.clear')).not.toBeInTheDocument();
  });
});
