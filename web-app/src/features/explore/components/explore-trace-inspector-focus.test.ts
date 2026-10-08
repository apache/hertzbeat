/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusTraceInspector } from './explore-trace-inspector-focus';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function fixture(targetTop: number) {
  document.body.innerHTML = `<div class="ant-drawer-body"><section data-trace-presentation="drawer">
    <div data-trace-detail-context></div><aside tabindex="-1"><header></header></aside>
  </section></div>`;
  const body = document.querySelector<HTMLElement>('.ant-drawer-body')!;
  const context = document.querySelector<HTMLElement>('[data-trace-detail-context]')!;
  const inspector = document.querySelector<HTMLElement>('aside')!;
  const header = inspector.querySelector('header')!;
  vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 50, 900, 650));
  vi.spyOn(context, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 50, 900, 100));
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, targetTop, 360, 40));
  const scroll = vi.fn();
  header.scrollIntoView = scroll;
  const focus = vi.spyOn(inspector, 'focus');
  return { inspector, focus, scroll };
}

describe('Trace drawer inspector focus', () => {
  it('focuses a visible inspector without scrolling the tall evidence region', () => {
    const { inspector, focus, scroll } = fixture(200);
    focusTraceInspector(inspector);
    expect(inspector).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scroll).not.toHaveBeenCalled();
  });

  it.each([100, 720])('reveals only the header when the keyboard target is outside the usable viewport (%s)', top => {
    const { inspector, scroll } = fixture(top);
    focusTraceInspector(inspector);
    expect(inspector).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('preserves ordinary focus outside the Trace drawer', () => {
    const inspector = document.createElement('aside');
    inspector.tabIndex = -1;
    document.body.append(inspector);
    const focus = vi.spyOn(inspector, 'focus');
    focusTraceInspector(inspector);
    expect(focus).toHaveBeenCalledWith();
    expect(inspector).toHaveFocus();
  });
});
