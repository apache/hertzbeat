/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MonitorEditorWorkspace } from './monitor-editor-workspace';

const appHelpUrl = 'https://hertzbeat.apache.org/docs/help/mysql';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../controller/use-monitor-editor-controller', () => ({
  useMonitorEditorController: () => ({
    state: { evidence: { kind: 'loading' }, draft: undefined, apps: [], helpUrl: appHelpUrl },
    actions: {}
  })
}));

afterEach(cleanup);

describe('MonitorEditorWorkspace', () => {
  it('keeps monitor help available while creating or editing', () => {
    render(<MonitorEditorWorkspace mode="new" />);

    expect(screen.getByRole('link', { name: 'monitor.help' })).toHaveAttribute('href', appHelpUrl);
  });
});
