/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import primitiveStyles from './hertzbeat-perses-primitives.module.css?raw';
import { logColumnMinimumWidth } from './hertzbeat-log-columns';
import { HertzBeatLogsTableAdapter } from './hertzbeat-logs-table-adapter';

describe('HertzBeatLogsTableAdapter', () => {
  afterEach(cleanup);

  it('makes official Perses rows keyboard reachable and reports the selected row without replacing the table', () => {
    const onSelect = vi.fn();
    const view = render(
      <HertzBeatLogsTableAdapter
        ariaLabel="Historical logs"
        columnLabels={{ time: 'Time', severity: 'Severity', message: 'Message' }}
        controlsId="log-inspector"
        selectedIndex={1}
        getAriaLabel={index => `Log ${index + 1}: checkout timeout`}
        getSeverityLabel={index => (index === 0 ? 'WARN' : 'INFO')}
        onSelect={onSelect}
      >
        <div>
          <div data-log-index="0">
            <div>
              <time dateTime="2026-09-04T15:18:00.123Z">time</time>
              <div>first</div>
            </div>
          </div>
          <div data-log-index="1">
            <div>
              <time dateTime="2026-09-04T15:19:00.123Z">time</time>
              <div>second</div>
            </div>
          </div>
        </div>
      </HertzBeatLogsTableAdapter>
    );

    const first = screen.getByRole('row', { name: 'Log 1: checkout timeout' });
    const second = screen.getByRole('row', { name: 'Log 2: checkout timeout' });
    expect(first).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('grid', { name: 'Historical logs' })).toContainElement(second);
    expect(screen.getAllByRole('gridcell')).toHaveLength(6);
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Time', 'Severity', 'Message']);
    expect(
      Array.from(first.querySelectorAll('[role="gridcell"]')).map(cell => cell.getAttribute('aria-colindex'))
    ).toEqual(['1', '2', '3']);
    expect(first).toHaveAttribute('aria-selected', 'false');
    expect(first).toHaveAttribute('aria-haspopup', 'dialog');
    expect(first.firstElementChild).toHaveAttribute('data-hertzbeat-log-severity', 'WARN');
    expect(screen.getByText('WARN')).toBeVisible();
    expect(screen.getByText('INFO')).toBeVisible();
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-controls', 'log-inspector');
    expect(view.container.querySelectorAll('[data-log-index]')).toHaveLength(2);

    fireEvent.click(first);
    expect(onSelect).toHaveBeenLastCalledWith(0, first);
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith(1, second);
    fireEvent.keyDown(first, { key: ' ' });
    expect(onSelect).toHaveBeenLastCalledWith(0, first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(second, { key: 'Home' });
    expect(first).toHaveFocus();
  });

  it('renders real service cells, preserves unknown values and updates recycled rows', async () => {
    render(
      <HertzBeatLogsTableAdapter
        ariaLabel="Logs"
        controlsId="inspector"
        columnLabels={{ time: 'Time', severity: 'Severity', service: 'Service', message: 'Message' }}
        getAriaLabel={index => `Log ${index}`}
        getServiceLabel={index => (index === 0 ? 'checkout-api' : undefined)}
        onSelect={vi.fn()}
      >
        <div data-log-index="0">
          <div>
            <time>time</time>
            <div>
              <p>timeout</p>
            </div>
          </div>
        </div>
      </HertzBeatLogsTableAdapter>
    );
    const row = screen.getByRole('row', { name: 'Log 0' });
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
      'Time',
      'Severity',
      'Service',
      'Message'
    ]);
    expect(screen.getByText('checkout-api')).toHaveAttribute('aria-colindex', '3');
    row.setAttribute('data-log-index', '1');
    await waitFor(() => expect(row).toHaveAccessibleName('Log 1'));
    expect(row.querySelector('[data-hertzbeat-log-service]')).toHaveTextContent('—');
    expect(screen.queryByText('checkout-api')).not.toBeInTheDocument();
  });

  it('keeps a compact visible time while retaining the full timestamp for assistive and pointer inspection', () => {
    render(
      <HertzBeatLogsTableAdapter
        ariaLabel="Historical logs"
        controlsId="log-inspector"
        getAriaLabel={() => '09/04/2026, 15:18:00 · checkout timeout'}
        onSelect={vi.fn()}
      >
        <div data-log-index="0">
          <div>
            <time dateTime="2026-09-04T15:18:00.123Z">2026-09-04T15:18:00.123Z</time>
            <div>checkout timeout</div>
          </div>
        </div>
      </HertzBeatLogsTableAdapter>
    );

    const expected = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hourCycle: 'h23',
      timeZoneName: 'short'
    }).format(new Date('2026-09-04T15:18:00.123Z'));
    const time = screen.getByText(expected);
    expect(time).toHaveAttribute('title', '2026-09-04T15:18:00.123Z');
    expect(time).toHaveAttribute('aria-label', '2026-09-04T15:18:00.123Z');
  });

  it('does not steal nested Perses button interactions', () => {
    const onSelect = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <HertzBeatLogsTableAdapter
          ariaLabel="Historical logs"
          controlsId="log-inspector"
          getAriaLabel={() => 'Log row'}
          onSelect={onSelect}
        >
          <div
            data-log-index="0"
            onMouseDown={() => {
              onSelect(0, document.createElement('div'));
            }}
          >
            <button type="button">Copy log options</button>
          </div>
        </HertzBeatLogsTableAdapter>
      </div>
    );

    const copyOptions = screen.getByRole('button', { name: 'Copy log options' });
    fireEvent.mouseDown(copyOptions);
    fireEvent.click(copyOptions);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('keeps the restored row as the roving tab stop after selection closes', () => {
    const onSelect = vi.fn<(index: number, row: HTMLElement) => void>();
    const view = render(adapterView(1, onSelect));
    const first = screen.getByRole('row', { name: 'Log 1' });
    const second = screen.getByRole('row', { name: 'Log 2' });
    second.focus();

    view.rerender(adapterView(undefined, onSelect));

    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
  });

  it('resynchronizes accessibility metadata when a virtualized row reuses its element for another index', async () => {
    render(
      <HertzBeatLogsTableAdapter
        ariaLabel="Historical logs"
        controlsId="log-inspector"
        selectedIndex={1}
        getAriaLabel={index => `Log ${index + 1}`}
        getSeverityLabel={index => (index === 0 ? 'WARN' : 'INFO')}
        onSelect={vi.fn()}
      >
        <div data-log-index="0">
          <div>
            <time dateTime="2026-09-04T15:18:00.123Z">time</time>
            <div>reused row</div>
          </div>
        </div>
      </HertzBeatLogsTableAdapter>
    );
    const reusedRow = screen.getByRole('row', { name: 'Log 1' });

    reusedRow.setAttribute('data-log-index', '1');

    await waitFor(() => expect(reusedRow).toHaveAccessibleName('Log 2'));
    expect(reusedRow).toHaveAttribute('aria-selected', 'true');
    expect(reusedRow).toHaveAttribute('tabindex', '0');
    expect(reusedRow.querySelectorAll('[data-hertzbeat-log-severity-text]')).toHaveLength(1);
    expect(screen.getByText('INFO')).toBeVisible();
    expect(screen.queryByText('WARN')).not.toBeInTheDocument();
  });

  it('keeps visible cell counts and indices aligned with headers when time is hidden', () => {
    const children = (
      <div data-log-index="0">
        <div>
          <time dateTime="2026-09-04T15:18:00.123Z">time</time>
          <div>message</div>
        </div>
      </div>
    );
    const props = {
      ariaLabel: 'Logs',
      controlsId: 'inspector',
      getAriaLabel: () => 'Log 1',
      getSeverityLabel: () => 'INFO',
      onSelect: vi.fn(),
      columnLabels: { time: 'Time', severity: 'Severity', message: 'Message' }
    };
    const view = render(<HertzBeatLogsTableAdapter {...props}>{children}</HertzBeatLogsTableAdapter>);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    view.rerender(
      <HertzBeatLogsTableAdapter {...props} showTime={false}>
        {children}
      </HertzBeatLogsTableAdapter>
    );
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Severity', 'Message']);
    expect(screen.getAllByRole('gridcell').map(cell => cell.getAttribute('aria-colindex'))).toEqual(['1', '2']);
    expect(view.container.querySelector('time')).toHaveAttribute('aria-hidden', 'true');
  });
});

function adapterView(selectedIndex: number | undefined, onSelect: (index: number, row: HTMLElement) => void) {
  return (
    <HertzBeatLogsTableAdapter
      ariaLabel="Historical logs"
      controlsId="log-inspector"
      selectedIndex={selectedIndex}
      getAriaLabel={index => `Log ${index + 1}`}
      onSelect={onSelect}
    >
      <div>
        <div data-log-index="0">first</div>
        <div data-log-index="1">second</div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
}

it('gives service grids priority over the existing three-column row and message selectors', () => {
  expect(primitiveStyles).toContain("[data-log-index] > div:first-child[data-hertzbeat-log-service-column='true']");
  expect(primitiveStyles).toContain(
    "[data-log-index] > div:first-child[data-hertzbeat-log-service-column='true'] > div:last-of-type"
  );
});

it('keeps native message/copy nodes while reordering and adding exact custom columns', () => {
  const onCopy = vi.fn();
  const props = { ariaLabel: 'Logs', controlsId: 'inspector', getAriaLabel: () => 'Record', onSelect: vi.fn() };
  const columns = [
    { id: 'message', kind: 'message' as const, label: 'Message' },
    { id: 'field', kind: 'field' as const, label: 'Result', getValue: () => '0' },
    { id: 'time', kind: 'time' as const, label: 'Time' }
  ];
  const view = render(
    <HertzBeatLogsTableAdapter {...props} columns={columns}>
      <div data-log-index="0">
        <div>
          <time>time</time>
          <div>
            <p>message</p>
            <button onClick={onCopy}>Copy</button>
          </div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  const copy = screen.getByRole('button', { name: 'Copy' });
  expect(screen.getAllByRole('columnheader').map(item => item.textContent)).toEqual(['Message', 'Result', 'Time']);
  expect(screen.getAllByRole('columnheader').map(item => item.getAttribute('aria-colindex'))).toEqual(['1', '2', '3']);
  expect(screen.getByText('0')).toHaveAttribute('aria-colindex', '2');
  expect(screen.getByText('0')).toHaveAttribute('title', '0');
  expect(copy.parentElement).toHaveStyle({ gridColumn: '1' });
  view.rerender(
    <HertzBeatLogsTableAdapter {...props} columns={[columns[2]!, columns[0]!]}>
      <div data-log-index="0">
        <div>
          <time>time</time>
          <div>
            <p>message</p>
            <button onClick={onCopy}>Copy</button>
          </div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  expect(screen.getByRole('button', { name: 'Copy' })).toBe(copy);
  expect(
    Array.from(view.container.querySelectorAll('[data-log-index] [role="gridcell"]')).map(cell =>
      cell.getAttribute('aria-colindex')
    )
  ).toEqual(['1', '2']);
  expect(
    Array.from(view.container.querySelectorAll('[data-log-index] [role="gridcell"]')).map(cell => cell.textContent)
  ).toEqual(['time', 'messageCopy']);
  fireEvent.click(copy);
  expect(onCopy).toHaveBeenCalledOnce();
  expect(screen.queryByRole('gridcell', { name: '0' })).not.toBeInTheDocument();
});

it('moves reorderable columns through the accessible header menu', async () => {
  const onAction = vi.fn();
  const actions = {
    menuLabel: 'All column actions',
    calculateField: 'Calculate field',
    showCalculate: false,
    moveLeft: 'Move Service left',
    moveRight: 'Move Service right',
    showMove: true,
    insertLeft: 'Insert to left…',
    insertRight: 'Insert to right…',
    replace: 'Replace column…',
    remove: 'Remove column',
    moveLeftDisabled: false,
    moveRightDisabled: true,
    insertLeftDisabled: false,
    insertRightDisabled: false,
    replaceDisabled: false,
    removeDisabled: false,
    insertOptions: [{ id: 'field', label: 'Field' }],
    replaceOptions: [{ id: 'field', label: 'Field' }],
    onAction
  };
  const view = render(
    <HertzBeatLogsTableAdapter
      ariaLabel="Logs"
      columns={[
        { id: 'time', kind: 'time', label: 'Time' },
        { id: 'service', kind: 'service', label: 'Service', reorderable: true, actions },
        { id: 'message', kind: 'message', label: 'Message' }
      ]}
    >
      <div />
    </HertzBeatLogsTableAdapter>
  );

  fireEvent.contextMenu(within(view.container).getByRole('columnheader', { name: /Service/u }));
  fireEvent.mouseEnter(await screen.findByText('Insert to left…'));
  await waitFor(() => expect(document.querySelector('[class*="columnSubmenu"]')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('menuitem', { name: 'Move Service left' }));

  expect(onAction).toHaveBeenCalledWith('move-left');
  view.rerender(
    <HertzBeatLogsTableAdapter
      ariaLabel="Logs"
      columns={[{ id: 'time', kind: 'time', label: 'Time', actions: { ...actions, showMove: false } }]}
    >
      <div />
    </HertzBeatLogsTableAdapter>
  );
  fireEvent.contextMenu(within(view.container).getByRole('columnheader', { name: /Time/u }));
  const menu = await screen.findByRole('menu');
  expect(menu.firstElementChild).not.toHaveClass('ant-dropdown-menu-item-divider');
});

it('keeps content on its expanded row and hides only its rendered column when disabled', () => {
  const columns = [
    { id: 'time', kind: 'time' as const, label: 'Time' },
    { id: 'message', kind: 'message' as const, label: 'Message' }
  ];
  const view = render(
    <HertzBeatLogsTableAdapter ariaLabel="Logs" columns={columns} rowHeight="large">
      <div data-log-index="0">
        <div>
          <time>time</time>
          <div>message</div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );

  const message = view.container.querySelector('[data-log-index] [role="gridcell"]:last-child');
  expect(message).toHaveStyle({ gridColumn: '1 / -1', gridRow: '2' });
  view.rerender(
    <HertzBeatLogsTableAdapter ariaLabel="Logs" columns={columns} rowHeight="large" showContent={false}>
      <div data-log-index="0">
        <div>
          <time>time</time>
          <div>message</div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  expect(view.container.querySelectorAll('[role="columnheader"]')).toHaveLength(1);
  expect(view.container.querySelector('[data-log-index] [role="gridcell"]')).toHaveTextContent('time');
});

it('fits the ordinary host-aware four columns within the 1230px result pane', () => {
  expect(
    logColumnMinimumWidth([
      { id: 'time', kind: 'time', label: 'Time' },
      { id: 'host', kind: 'field', label: 'Host' },
      { id: 'service', kind: 'service', label: 'Service' },
      { id: 'message', kind: 'message', label: 'Message' }
    ])
  ).toBeLessThanOrEqual(691);
});

it('renders display-only columns without adding selection or keyboard stops', () => {
  const { container } = render(
    <HertzBeatLogsTableAdapter
      ariaLabel="Dashboard logs"
      columns={[
        { id: 'message', label: 'Message', kind: 'message' },
        { id: 'field', label: 'Literal field', kind: 'field', getValue: () => 'false' }
      ]}
    >
      <div data-log-index="0">
        <div>
          <time>time</time>
          <div>message</div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  expect(screen.getByRole('table', { name: 'Dashboard logs' })).toBeVisible();
  expect(screen.getByText('false')).toBeVisible();
  expect(container.querySelector('[aria-selected], [aria-controls], [tabindex]')).toBeNull();
});
it('formats display-only time in the selected zone while preserving exact datetime', () => {
  const { container } = render(
    <HertzBeatLogsTableAdapter
      ariaLabel="Dashboard ordered logs"
      timeZone="Asia/Shanghai"
      columns={[
        { id: 'time', kind: 'time', label: 'Time' },
        { id: 'service', kind: 'field', label: 'Service', getValue: () => 'checkout' },
        { id: 'message', kind: 'message', label: 'Message' },
        { id: 'trace', kind: 'field', label: 'Trace ID', getValue: () => 'trace-1' }
      ]}
    >
      <div data-log-index="0">
        <div>
          <time dateTime="2026-09-07T06:04:29.529Z">2026-09-07T06:04:29.529Z</time>
          <div>failure marker</div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  expect(container.querySelector('time')!.textContent).toContain('14:04:29.529');
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-09-07T06:04:29.529Z');
});

it.each([
  ['UTC', '06:04:29.529'],
  ['Asia/Shanghai', '14:04:29.529'],
  ['America/New_York', '02:04:29.529']
])('formats native default columns in %s without changing machine time', (timeZone, expected) => {
  const { container } = render(
    <HertzBeatLogsTableAdapter ariaLabel="Default dashboard logs" timeZone={timeZone}>
      <div data-log-index="0">
        <div>
          <time dateTime="2026-09-07T06:04:29.529Z">raw</time>
          <div>message</div>
        </div>
      </div>
    </HertzBeatLogsTableAdapter>
  );
  expect(container.querySelector('time')!.textContent).toContain(expected);
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-09-07T06:04:29.529Z');
});
