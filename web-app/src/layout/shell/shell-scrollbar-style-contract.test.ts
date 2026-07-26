/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell scrollbar style contract', () => {
  it('uses a thin token-backed scrollbar only on shell-owned scroll containers', () => {
    expect(shellStyles).toMatch(
      /\.navigationScroll,\s*\.navigationFlyout,\s*\.alertNotificationList\s*\{[^}]*scrollbar-width:\s*thin[^}]*scrollbar-color:\s*var\(--hb-border-subtle\)\s+transparent/
    );
    expect(shellStyles).toMatch(
      /\.navigationScroll::-webkit-scrollbar,\s*\.navigationFlyout::-webkit-scrollbar,\s*\.alertNotificationList::-webkit-scrollbar\s*\{[^}]*width:\s*6px/
    );
    expect(shellStyles).toMatch(
      /\.navigationScroll::-webkit-scrollbar-track,\s*\.navigationFlyout::-webkit-scrollbar-track,\s*\.alertNotificationList::-webkit-scrollbar-track\s*\{[^}]*background:\s*transparent/
    );
    expect(shellStyles).toMatch(
      /\.navigationScroll::-webkit-scrollbar-thumb,\s*\.navigationFlyout::-webkit-scrollbar-thumb,\s*\.alertNotificationList::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--hb-border-subtle\)/
    );
    expect(shellStyles).not.toMatch(/(?:html|body|\*)::-webkit-scrollbar/);
  });
});
