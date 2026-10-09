/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import { SpanRelationships } from './explore-span-relationships';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => (options?.count == null ? key : `${key}:${options.count}`)
  })
}));
afterEach(cleanup);
type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
const traceId = 'a'.repeat(32);
const id = (value: string) => value.repeat(16);
const key = (value: string) => `exploreInvestigation.trace.relationships.${value}`;
function span(value: string, parent: string | null = null): Span {
  return {
    traceId,
    spanId: id(value),
    parentSpanId: parent,
    spanName: `operation-${value}`,
    serviceName: 'checkout',
    status: 'OK',
    statusMessage: null,
    spanKind: 'SERVER',
    traceState: null,
    scopeName: null,
    scopeVersion: null,
    durationNanos: '1200000',
    startTime: 1000,
    startTimeUnixNano: '1000000000',
    highlighted: false,
    resourceAttributes: {},
    spanAttributes: {},
    events: [],
    links: [],
    codeNavigationHint: null
  };
}
it('selects loaded parent and only direct same-trace children without navigation', () => {
  const parent = span('1');
  const current = span('2', parent.spanId);
  const child = span('3', current.spanId);
  const grandchild = span('4', child.spanId);
  const foreign = { ...span('5', current.spanId), traceId: 'b'.repeat(32) };
  const onSelect = vi.fn();
  render(
    <SpanRelationships span={current} spans={[parent, current, child, grandchild, foreign]} onSelect={onSelect} />
  );
  fireEvent.click(screen.getByRole('button', { name: /operation-1/ }));
  fireEvent.click(screen.getByRole('button', { name: /operation-3/ }));
  expect(onSelect.mock.calls).toEqual([[parent.spanId], [child.spanId]]);
  expect(screen.getByText(`${key('children')}:1`)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /operation-4|operation-5/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('distinguishes unreported and missing parents without asserting a complete root', () => {
  const current = span('2');
  const view = render(<SpanRelationships span={current} spans={[current]} onSelect={vi.fn()} />);
  expect(screen.getByText(key('noParent'))).toBeInTheDocument();
  view.rerender(
    <SpanRelationships span={{ ...current, parentSpanId: id('1') }} spans={[current]} onSelect={vi.fn()} />
  );
  expect(screen.getByText(id('1'))).toBeInTheDocument();
  expect(screen.getByText(key('missingParent'))).toBeInTheDocument();
  expect(screen.queryByText(key('noParent'))).not.toBeInTheDocument();
});
it('keeps causal links separate and enables only loaded same-trace targets, retaining link details', () => {
  const current = span('1');
  const linked = span('2');
  current.links = [
    {
      traceId,
      spanId: linked.spanId,
      traceState: 'vendor=value',
      attributes: { reason: 'queue' },
      droppedAttributesCount: 2
    },
    { traceId: 'b'.repeat(32), spanId: linked.spanId, traceState: null, attributes: {}, droppedAttributesCount: null }
  ];
  const onSelect = vi.fn();
  render(<SpanRelationships span={current} spans={[current, linked]} onSelect={onSelect} />);
  expect(screen.getByText(`${key('children')}:0`)).toBeInTheDocument();
  const region = screen.getByRole('region', { name: `${key('links')}:2` });
  expect(within(region).getAllByRole('button')).toHaveLength(1);
  fireEvent.click(within(region).getByRole('button', { name: /operation-2/ }));
  expect(onSelect).toHaveBeenCalledWith(linked.spanId);
  expect(within(region).getByText(key('missingLink'))).toBeInTheDocument();
  expect(within(region).getByText('b'.repeat(32))).toBeInTheDocument();
  fireEvent.click(within(region).getAllByText(key('details'))[0]!);
  expect(within(region).getByText('queue')).toBeVisible();
  expect(within(region).getByText('vendor=value')).toBeVisible();
  expect(within(region).getByText('2', { selector: 'dd' })).toBeVisible();
});
it('disables relation selection for stale evidence', () => {
  const parent = span('1');
  const current = span('2', parent.spanId);
  const child = span('3', current.spanId);
  current.links = [{ traceId, spanId: child.spanId, traceState: null, attributes: {}, droppedAttributesCount: 0 }];
  const onSelect = vi.fn();
  render(<SpanRelationships span={current} spans={[parent, current, child]} onSelect={onSelect} disabled />);
  for (const button of screen.getAllByRole('button')) {
    expect(button).toBeDisabled();
    fireEvent.click(button);
  }
  expect(onSelect).not.toHaveBeenCalled();
});
