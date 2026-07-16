/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, expect, it } from 'vitest';

import source from './explore-page.tsx?raw';

describe('Explore page architecture', () => {
  it('keeps routing, TanStack, transport, submission, and browser globals in the controller', () => {
    expect(source).not.toMatch(/react-router-dom|@tanstack\/react-query|\.\.\/api\/|useExploreSubmission|\bwindow\b/);
    expect(source).toContain('useExplorePageController');
  });
});
