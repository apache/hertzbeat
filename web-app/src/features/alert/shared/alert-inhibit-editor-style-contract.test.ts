/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import stylesheet from './alert-inhibit-editor.module.css?raw';

describe('alert inhibit editor source geometry', () => {
  it('keeps the 7/12/5 grid free of an extra gutter that narrows the source control column', () => {
    expect(stylesheet).toMatch(
      /\.fieldRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(0,\s*12fr\)\s+minmax\(0,\s*5fr\);[^}]*column-gap:\s*0;/s
    );
    expect(stylesheet).toMatch(/\.fieldLabel\s*\{[^}]*padding-inline-end:\s*12px;/s);
  });

  it('resets the desktop label gutter in the mobile single-column layout', () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*800px\)[\s\S]*?\.fieldLabel\s*\{[^}]*padding-inline-end:\s*0;[^}]*text-align:\s*left;/s
    );
  });

  it('gives the rule explanation a flat full-width three-step reading order', () => {
    expect(stylesheet).toMatch(
      /\.logicPreview\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(0,\s*17fr\);/s
    );
    expect(stylesheet).toMatch(/\.logicSteps\s*\{[^}]*display:\s*grid;[^}]*gap:\s*4px;/s);
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*800px\)[\s\S]*?\.logicPreview\s*\{[^}]*grid-template-columns:\s*1fr;/s
    );
  });
});
