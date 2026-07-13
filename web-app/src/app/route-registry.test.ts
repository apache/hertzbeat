/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import { routeRegistry } from './route-registry';

describe('route registry', () => {
  it('keeps route ids and paths unique', () => {
    expect(new Set(routeRegistry.map(route => route.id)).size).toBe(routeRegistry.length);
    expect(new Set(routeRegistry.map(route => route.path)).size).toBe(routeRegistry.length);
  });

  it('keeps the wildcard route out of navigation', () => {
    expect(routeRegistry.find(route => route.path === '*')?.navigation).toBe(false);
  });

  it('preserves the master entry routes', () => {
    expect(routeRegistry.map(route => route.path)).toEqual(
      expect.arrayContaining(['/', '/dashboard', '/monitors', '/alerts', '/alerts/rules', '/alerts/groups', '/bulletin', '/status', '/passport/login'])
    );
  });
});
