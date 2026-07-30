/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { installTestDomStyleCompatibility } from './test-dom-style-compatibility';

describe('test DOM setup', () => {
  it('forwards element style reads and drops only the pseudo-element argument unsupported by jsdom', () => {
    const nativeGetComputedStyle = vi.fn(() => ({ display: 'block' }) as CSSStyleDeclaration);
    const testWindow = { getComputedStyle: nativeGetComputedStyle } as unknown as Window;
    const element = document.createElement('div');

    installTestDomStyleCompatibility(testWindow);
    const elementStyle = testWindow.getComputedStyle(element);
    const pseudoElementStyle = testWindow.getComputedStyle(element, '::before');

    expect(elementStyle.display).toBe('block');
    expect(pseudoElementStyle.display).toBe('block');
    expect(nativeGetComputedStyle).toHaveBeenNthCalledWith(1, element);
    expect(nativeGetComputedStyle).toHaveBeenNthCalledWith(2, element);
  });
});
