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

import { z } from 'zod';
import { expect, test, type APIRequestContext } from '@playwright/test';

// This fixture must never target a real backend or the ordinary app preview.
test.skip(({ baseURL }) => baseURL !== 'http://127.0.0.1:4288', 'Requires the isolated synthetic HTTP fixture');

test.beforeEach(async ({ page, request }) => {
  await request.get('/control/reset');
  await page.goto('/');
  await page.waitForFunction('Boolean(window.fixture)');
});

test('native cross-tab headers clear before synthetic login and preserve its HttpOnly cookie', async ({
  page,
  context,
  request
}) => {
  const writer = await context.newPage();
  await writer.goto('/');
  await writer.waitForFunction('Boolean(window.fixture)');
  const old = page.evaluate<unknown>("window.fixture.apiFetch('/api/ordinary/delay?name=old').then(r => r.status)");
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('old');
  const login = writer.evaluate<unknown>(
    "window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')"
  );
  await expect.poll(async () => (await fixtureStatus(request)).logins).toBe(0);
  await request.get('/control/release?name=old');
  await old;
  await login;
  const stats = await fixtureStatus(request);
  expect(stats.events).toEqual(['start:old', 'clear:old', 'login']);
  expect(
    await writer.evaluate<unknown>(
      "window.fixture.apiFetch('/api/read').then(r => r.json()).then(d => d.cookiePresent)"
    )
  ).toBe(true);
  // Fresh fixture context only: inspect the synthetic cookie name, never real tokens.
  const synthetic = (await context.cookies()).filter(cookie => cookie.name === 'hb_audit_session');
  expect(synthetic).toHaveLength(1);
  expect(synthetic[0]?.httpOnly).toBe(true);
});

test('parallel readers finish before a queued writer and later readers follow it', async ({ page, request }) => {
  const one = page.evaluate<unknown>("window.fixture.apiFetch('/api/ordinary/delay?name=one').then(r => r.status)");
  const two = page.evaluate<unknown>("window.fixture.apiFetch('/api/ordinary/delay?name=two').then(r => r.status)");
  await expect.poll(async () => (await fixtureStatus(request)).pending.length).toBe(2);
  await page.evaluate<unknown>(
    "window.pendingLogin = window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential'); void window.pendingLogin"
  );
  await expect
    .poll(() =>
      page.evaluate<unknown>("navigator.locks.query().then(s => s.pending.some(l => l.mode === 'exclusive'))")
    )
    .toBe(true);
  const late = page.evaluate<unknown>(
    "window.fixture.apiFetch('/api/read').then(r => r.json()).then(d => d.cookiePresent)"
  );
  expect((await fixtureStatus(request)).reads).toBe(2);
  await request.get('/control/release?name=one');
  await one;
  expect((await fixtureStatus(request)).logins).toBe(0);
  await request.get('/control/release?name=two');
  await two;
  await page.evaluate<unknown>('window.pendingLogin');
  expect(await late).toBe(true);
  const stats = await fixtureStatus(request);
  expect(stats.logins).toBe(1);
  expect(stats.reads).toBe(3);
});

test('401 refresh obtains exclusive admission without nested lock deadlock', async ({ page, request }) => {
  await page.evaluate<unknown>('window.fixture.installRefresh()');
  const old = page.evaluate<unknown>("window.fixture.apiFetch('/api/ordinary/delay?name=refresh').then(r => r.status)");
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('refresh');
  await request.get('/control/release?name=refresh');
  // Safe replay reaches the same synthetic endpoint a second time.
  await expect.poll(async () => (await fixtureStatus(request)).refreshes).toBe(1);
  await expect
    .poll(async () => (await fixtureStatus(request)).events.filter((event: string) => event === 'start:refresh').length)
    .toBe(2);
  await request.get('/control/release?name=refresh');
  expect(await old).toBe(401);
  expect((await fixtureStatus(request)).refreshes).toBe(1);
});

test('stream headers release admission while body stays open and caller may cancel', async ({ page, request }) => {
  await page.evaluate<unknown>(
    "window.streamCaller = new AbortController(); window.streamHeaders = window.fixture.apiStreamFetch('/api/stream/open',{signal:window.streamCaller.signal}); void window.streamHeaders"
  );
  await page.evaluate<unknown>('window.streamHeaders');
  await page.evaluate<unknown>("window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')");
  expect((await fixtureStatus(request)).logins).toBe(1);
  await page.evaluate<unknown>('window.streamCaller.abort()');
});

test('cancelled pre-header stream cannot clear a later synthetic login cookie', async ({ page, request }) => {
  await page.evaluate<unknown>(
    "window.streamCaller = new AbortController(); window.pendingStream = window.fixture.apiStreamFetch('/api/stream/delay?name=cancel',{signal:window.streamCaller.signal}).catch(e => e.name); void window.pendingStream"
  );
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('cancel');
  await page.evaluate<unknown>('window.streamCaller.abort()');
  await page.evaluate<unknown>('window.pendingStream');
  await page.evaluate<unknown>("window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')");
  await request.get('/control/release?name=cancel');
  expect(
    await page.evaluate<unknown>("window.fixture.apiFetch('/api/read').then(r => r.json()).then(d => d.cookiePresent)")
  ).toBe(true);
});

test('native EventSource opening orders clearing before login and releases after open', async ({ page, request }) => {
  await page.evaluate<unknown>(
    "window.eventOpen = false; window.stream = window.fixture.openBrowserEventStream('/api/events/delay?name=events',{eventNames:[],onOpen:()=>window.eventOpen=true,onEvent:()=>{},onRetrying:()=>{},onUnavailable:()=>{}})"
  );
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('events');
  const login = page.evaluate<unknown>(
    "window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')"
  );
  await request.get('/control/release?name=events');
  await login;
  await expect.poll(() => page.evaluate<unknown>('window.eventOpen')).toBe(true);
  expect(
    await page.evaluate<unknown>("window.fixture.apiFetch('/api/read').then(r => r.json()).then(d => d.cookiePresent)")
  ).toBe(true);
  await page.evaluate<unknown>('window.stream.close()');
});

test('failed logout stays failure and preserves fixture cookie', async ({ page }) => {
  await page.evaluate<unknown>("window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')");
  expect(await page.evaluate<unknown>("window.fixture.logoutSession().then(()=> 'success',e=>e.kind)")).toBe(
    'unavailable'
  );
  expect(
    await page.evaluate<unknown>("window.fixture.apiFetch('/api/read').then(r => r.json()).then(d => d.cookiePresent)")
  ).toBe(true);
});

test('native queued EventSource close and timeout cannot construct after a lock grant', async ({ page, request }) => {
  await page.clock.install();
  await page.evaluate<unknown>(
    "window.holder = navigator.locks.request('hertzbeat-ui-session-mutation',()=>new Promise(resolve=>window.releaseHolder=resolve)); void window.holder"
  );
  await expect.poll(() => page.evaluate<unknown>('Boolean(window.releaseHolder)')).toBe(true);
  await page.evaluate<unknown>(
    "window.closedStream = window.fixture.openBrowserEventStream('/api/events/delay?name=closed',{eventNames:[],onOpen:()=>{},onEvent:()=>{},onRetrying:()=>{},onUnavailable:()=>{}}); window.closedStream.close(); window.expiredStream=window.fixture.openBrowserEventStream('/api/events/delay?name=expired',{eventNames:[],onOpen:()=>{},onEvent:()=>{},onRetrying:()=>{},onUnavailable:()=>{}})"
  );
  await page.clock.runFor(30_001);
  await page.evaluate<unknown>('window.expiredStream.close(); window.releaseHolder()');
  await page.evaluate<unknown>('window.holder');
  expect((await fixtureStatus(request)).pending).toEqual([]);
});

test('native EventSource timeout closes its transport before a later login', async ({ page, request }) => {
  await page.clock.install();
  await page.evaluate<unknown>(
    "window.stream = window.fixture.openBrowserEventStream('/api/events/delay?name=timeout',{eventNames:[],onOpen:()=>{},onEvent:()=>{},onRetrying:()=>{},onUnavailable:()=>{}})"
  );
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('timeout');
  await page.clock.runFor(30_001);
  await page.evaluate<unknown>('window.stream.close()');
  await page.evaluate<unknown>("window.fixture.loginSession('synthetic-operator','synthetic-fixture-credential')");
  await request.get('/control/release?name=timeout');
  expect(
    await page.evaluate<unknown>("window.fixture.apiFetch('/api/read').then(r=>r.json()).then(d=>d.cookiePresent)")
  ).toBe(true);
});

test('throwing native open callback retires its owner before reporting and never reconnects', async ({
  page,
  request
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.evaluate<unknown>(`
    const Native = window.EventSource;
    window.callbackStats = { sources: 0, closed: 0 };
    window.addEventListener("error", () => { window.statsAtReport = { ...window.callbackStats }; });
    window.EventSource = class extends Native {
      constructor(url, options) {
        super(url, options);
        window.callbackStats.sources++;
      }
      close() {
        window.callbackStats.closed++;
        super.close();
      }
    };
  `);
  await page.evaluate<unknown>(
    "window.stream = window.fixture.openBrowserEventStream('/api/events/delay?name=callback',{eventNames:[],onOpen:()=>{throw new Error('Synthetic open callback failure')},onEvent:()=>{},onRetrying:()=>{},onUnavailable:()=>{}})"
  );
  await expect.poll(async () => (await fixtureStatus(request)).pending).toContain('callback');
  await request.get('/control/release?name=callback');
  await expect.poll(() => errors).toEqual(['Synthetic open callback failure']);
  expect(await page.evaluate<unknown>('window.callbackStats')).toEqual({ sources: 1, closed: 1 });
  expect(await page.evaluate<unknown>('window.statsAtReport')).toEqual({ sources: 1, closed: 1 });
  await page.clock.runFor(40_000);
  expect(await page.evaluate<unknown>('window.callbackStats')).toEqual({ sources: 1, closed: 1 });
  expect((await fixtureStatus(request)).refreshes).toBe(0);
  await page.evaluate<unknown>('window.stream.close()');
  expect(await page.evaluate<unknown>('window.callbackStats')).toEqual({ sources: 1, closed: 1 });
});

const fixtureStatusSchema = z.object({
  events: z.array(z.string()),
  pending: z.array(z.string()),
  logins: z.number(),
  refreshes: z.number(),
  reads: z.number()
});
async function fixtureStatus(request: APIRequestContext) {
  const value: unknown = await (await request.get('/control/status')).json();
  return fixtureStatusSchema.parse(value);
}
