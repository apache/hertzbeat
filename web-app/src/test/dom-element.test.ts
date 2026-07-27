/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { requireDomElement } from './dom-element';

describe('requireDomElement', () => {
  it('retains HTML and SVG elements for DOM matchers', () => {
    const html = document.createElement('section');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(requireDomElement(html, 'HTML fixture')).toBe(html);
    expect(requireDomElement(svg, 'SVG fixture')).toBe(svg);
  });

  it.each([null, undefined])('rejects a missing DOM element: %s', element => {
    expect(() => requireDomElement(element, 'Required fixture')).toThrow('Required fixture was not rendered.');
  });
});
