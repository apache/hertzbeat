/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
