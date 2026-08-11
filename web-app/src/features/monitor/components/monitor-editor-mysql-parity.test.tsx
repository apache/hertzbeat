/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MonitorParamDefine } from '../model/monitor-contract';
import { createMonitorEditorDraft } from '../model/monitor-editor-draft';
import { MonitorEditorFormView } from './monitor-editor-form-view';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

afterEach(cleanup);

describe('MySQL monitor editor parity', () => {
  it('preserves the established advanced-field order and field shapes', () => {
    const defines = mysqlDefines();
    const draft = createMonitorEditorDraft(undefined, 'mysql', 'static', defines);
    const controller = {
      state: {
        evidence: { kind: 'ready' as const },
        draft,
        defines,
        apps: [{ category: 'db', value: 'mysql', label: 'MySQL' }],
        collectors: [],
        busy: false,
        command: 'idle' as const,
        feedback: null,
        validationIssues: [],
        returnTo: '/monitors',
        scrapeValues: ['static'] as const,
        sourceKey: 'new:mysql:static',
        labelSuggestions: undefined
      },
      actions: {
        updateMonitor: vi.fn(),
        updateCollector: vi.fn(),
        updateGrafana: vi.fn(),
        updateParam: vi.fn(),
        setParamValid: vi.fn(),
        changeSource: vi.fn(),
        detect: vi.fn(),
        save: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn()
      }
    };

    render(<MonitorEditorFormView mode="new" controller={controller} />);
    fireEvent.click(screen.getByRole('button', { name: /monitor.editor.advanced/ }));

    const ordered = [
      'Query Timeout(ms)',
      'URL',
      'Enable SSH Tunnel',
      'SSH Host',
      'SSH Port',
      'SSH Timeout(ms)',
      'SSH Username',
      'SSH Password',
      'Share SSH Connection',
      'SSH PrivateKey',
      'SSH PrivateKey PassPhrase'
    ].map(label => screen.getByText(label));
    ordered.slice(1).forEach((item, index) => {
      expect(ordered[index]!.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(screen.getByLabelText('SSH Host')).toHaveAttribute('placeholder', 'When Enable SSH Tunnel');
    expect(screen.getByLabelText('SSH Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('SSH PrivateKey').tagName).toBe('TEXTAREA');
    expect(screen.getByRole('switch', { name: 'Share SSH Connection' })).toBeChecked();
  });
});

function mysqlDefines(): MonitorParamDefine[] {
  return [
    define('host', 'host', { required: true }),
    define('port', 'number', { required: true, range: '[0,65535]', defaultValue: '3306' }),
    define('timeout', 'number', { name: 'Query Timeout(ms)', hide: true, range: '[400,200000]' }),
    define('database', 'text', { name: 'Database Name' }),
    define('username', 'text', { name: 'Username', limit: 50 }),
    define('password', 'password', { name: 'Password' }),
    define('url', 'text', { name: 'URL', hide: true }),
    define('enableSshTunnel', 'boolean', { name: 'Enable SSH Tunnel', hide: true, required: true }),
    define('sshHost', 'text', { name: 'SSH Host', hide: true, placeholder: 'When Enable SSH Tunnel' }),
    define('sshPort', 'number', {
      name: 'SSH Port',
      hide: true,
      range: '[0,65535]',
      defaultValue: '22'
    }),
    define('sshTimeout', 'number', { name: 'SSH Timeout(ms)', hide: true, range: '[400,200000]' }),
    define('sshUsername', 'text', { name: 'SSH Username', hide: true }),
    define('sshPassword', 'password', { name: 'SSH Password', hide: true }),
    define('sshShareConnection', 'boolean', {
      name: 'Share SSH Connection',
      hide: true,
      required: true,
      defaultValue: 'true'
    }),
    define('sshPrivateKey', 'textarea', { name: 'SSH PrivateKey', hide: true }),
    define('sshPrivateKeyPassphrase', 'password', { name: 'SSH PrivateKey PassPhrase', hide: true })
  ];
}

function define(
  field: string,
  type: string,
  patch: Omit<Partial<MonitorParamDefine>, 'name'> & { name?: string } = {}
): MonitorParamDefine {
  const { name = field, ...rest } = patch;
  return {
    id: null,
    app: 'mysql',
    field,
    name: { 'en-US': name },
    type,
    required: false,
    defaultValue: null,
    placeholder: null,
    range: null,
    limit: null,
    options: null,
    keyAlias: null,
    valueAlias: null,
    depend: null,
    hide: false,
    ...rest
  };
}
