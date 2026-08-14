/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ value: scheduleController() }));
vi.mock('../controller/use-agent-schedule-controller', () => ({
  useAgentScheduleController: () => controller.value
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AgentSchedulePage } from './agent-schedule-page';

describe('AgentSchedulePage', () => {
  beforeEach(() => {
    controller.value = scheduleController();
  });
  afterEach(cleanup);

  it('renders the system schedule and delegates every lifecycle action', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'aiSchedules.title' })).toBeInTheDocument();
    const row = screen.getByText('Daily database review').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(within(row!).getByRole('switch'));
    fireEvent.click(within(row!).getByRole('button', { name: 'aiSchedules.actions.runNow' }));
    fireEvent.click(within(row!).getByRole('button', { name: 'aiSchedules.actions.transcript' }));
    fireEvent.click(within(row!).getByRole('button', { name: 'aiSchedules.actions.edit' }));
    fireEvent.click(within(row!).getByRole('button', { name: 'aiSchedules.actions.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(controller.value.actions.toggle).toHaveBeenCalledWith(7, false);
    expect(controller.value.actions.run).toHaveBeenCalledWith(7);
    expect(controller.value.actions.openTranscript).toHaveBeenCalledWith(controller.value.list.items[0]);
    expect(controller.value.actions.openEdit).toHaveBeenCalledWith(controller.value.list.items[0]);
    expect(controller.value.actions.delete).toHaveBeenCalledWith(7);
  });

  it('shows the complete editor and delegates the owned draft', () => {
    controller.value = scheduleController({
      editor: {
        mode: 'create',
        scheduleId: null,
        draft: {
          name: 'Availability review',
          instruction: 'Review production availability and notify the on-call receiver.',
          cronExpression: '0 0 9 * * *',
          enabled: true,
          receiverIds: [11],
          templateId: null
        }
      }
    });
    renderPage();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Availability review')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('0 0 9 * * *')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'aiSchedules.editor.save' }));

    expect(controller.value.actions.save).toHaveBeenCalledOnce();
  });

  it('keeps loading, empty, and unavailable states distinct', () => {
    controller.value = scheduleController({
      list: { kind: 'loading', items: [], total: 0, pageIndex: 0, pageSize: 20 }
    });
    const view = renderPage();
    expect(document.querySelector('[data-state="loading"]')).toHaveTextContent('aiSchedules.states.loading');

    controller.value = scheduleController({ list: { kind: 'empty', items: [], total: 0, pageIndex: 0, pageSize: 20 } });
    view.rerender(shell());
    expect(document.querySelector('[data-state="empty"]')).toHaveTextContent('aiSchedules.states.empty');

    controller.value = scheduleController({ list: { kind: 'error', items: [], total: 0, pageIndex: 0, pageSize: 20 } });
    view.rerender(shell());
    expect(document.querySelector('[data-state="unavailable"]')).toHaveTextContent('aiSchedules.states.unavailable');
  });

  it('keeps a failed first create visible while the schedule list is empty', () => {
    controller.value = scheduleController({
      list: { kind: 'empty', items: [], total: 0, pageIndex: 0, pageSize: 20 },
      mutationFailed: true
    });

    renderPage();

    expect(screen.getByText('aiSchedules.states.mutationFailed')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(shell());
}

function shell() {
  return (
    <MemoryRouter>
      <App>
        <AgentSchedulePage />
      </App>
    </MemoryRouter>
  );
}

function scheduleController(overrides: Record<string, unknown> = {}) {
  const schedule = {
    id: 7,
    name: 'Daily database review',
    instruction: 'Review database saturation.',
    cronExpression: '0 0 9 * * *',
    enabled: true,
    sessionId: 9,
    receiverIds: [11],
    templateId: 21,
    createdFromSessionUid: null,
    lastTriggerAt: null,
    nextTriggerAt: 1_786_678_800_000,
    creator: 'admin',
    modifier: 'admin',
    gmtCreate: null,
    gmtUpdate: null
  };
  return {
    list: { kind: 'ready', items: [schedule], total: 1, pageIndex: 0, pageSize: 20 },
    options: {
      receivers: [{ id: 11, name: 'On-call email', type: 1 }],
      templates: [{ id: 21, name: 'AI review', type: 1 }]
    },
    editor: null,
    transcript: {
      open: false,
      schedule: null,
      kind: 'idle',
      entries: [],
      pageIndex: 0,
      hasEarlier: false,
      loadingEarlier: false
    },
    busy: null,
    mutationFailed: false,
    actions: {
      reload: vi.fn(),
      setPage: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      closeEditor: vi.fn(),
      updateDraft: vi.fn(),
      save: vi.fn(),
      toggle: vi.fn(),
      run: vi.fn(),
      delete: vi.fn(),
      openTranscript: vi.fn(),
      loadEarlierTranscript: vi.fn(),
      closeTranscript: vi.fn()
    },
    ...overrides
  };
}
