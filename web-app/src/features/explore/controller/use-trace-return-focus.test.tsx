/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTraceReturnFocus } from './use-trace-return-focus';

afterEach(cleanup);

const background = '/explore?signal=traces&start=1000&end=2000&timeZone=UTC';
const detail = `${background}&traceId=${'a'.repeat(32)}&returnTo=${encodeURIComponent(background)}`;
function Harness() {
  const [path, setPath] = useState(background);
  const open = useTraceReturnFocus(path, setPath);
  return (
    <>
      <div data-trace-results tabIndex={-1} aria-label="Results">
        <button onClick={() => open(detail)}>Trace</button>
      </div>
      {path === detail && (
        <div role="dialog">
          <button onClick={() => open(background)}>Close</button>
          <button onClick={() => open('/dashboard')}>Navigate</button>
        </div>
      )}
      <button>Other</button>
    </>
  );
}
describe('trace return focus', () => {
  it('restores the result trigger after explicit return and preserves an active outside focus', async () => {
    render(<Harness />);
    const trigger = screen.getByText('Trace');
    trigger.focus();
    act(() => trigger.click());
    const close = screen.getByText('Close');
    close.focus();
    act(() => close.click());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    act(() => trigger.click());
    const other = screen.getByText('Other');
    other.focus();
    act(() => screen.getByText('Close').click());
    await waitFor(() => expect(document.activeElement).toBe(other));
  });
  it('falls back to the results container if the origin row disappears', async () => {
    render(<Harness />);
    const trigger = screen.getByText('Trace');
    trigger.focus();
    act(() => trigger.click());
    const close = screen.getByText('Close');
    close.focus();
    trigger.remove();
    act(() => close.click());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Results')));
  });
  it('does not restore focus on unrelated navigation', async () => {
    render(<Harness />);
    const trigger = screen.getByText('Trace');
    trigger.focus();
    act(() => trigger.click());
    const navigate = screen.getByText('Navigate');
    navigate.focus();
    act(() => navigate.click());
    await act(async () => Promise.resolve());
    expect(document.activeElement).not.toBe(trigger);
  });
});
