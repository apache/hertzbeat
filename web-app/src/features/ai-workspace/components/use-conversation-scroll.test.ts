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

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { useConversationScroll } from './use-conversation-scroll';

function fixture(): AgentWorkspaceViewModel {
  const noop = async () => {};
  return {
    sessions: { status: 'ready', items: [] },
    selectedSessionUid: 'one',
    transcript: {
      status: 'ready',
      items: [{ id: 1, sequence: 1, role: 'assistant', text: 'History', createdAt: null }]
    },
    draftMessages: [],
    run: { status: 'idle', messages: [], tools: [], approvals: [], inputs: [] },
    invalidTarget: false,
    composer: '',
    streaming: false,
    stopping: false,
    actions: {
      selectSession: noop,
      newInvestigation: () => {},
      setComposer: () => {},
      send: noop,
      stop: noop,
      retry: noop,
      recover: noop,
      decideApproval: noop,
      submitInteraction: noop
    }
  };
}
function setup() {
  const element = document.createElement('div');
  let height = 1000,
    top = 0;
  Object.defineProperties(element, {
    scrollHeight: { get: () => height },
    clientHeight: { get: () => 200 },
    scrollTop: {
      get: () => top,
      set: (value: number) => {
        top = Math.max(0, Math.min(value, height - 200));
      }
    }
  });
  const model = fixture();
  const hook = renderHook((controller: AgentWorkspaceViewModel) => useConversationScroll(controller), {
    initialProps: model
  });
  Object.defineProperty(hook.result.current.viewportRef, 'current', { value: element, writable: true });
  hook.rerender({ ...model });
  const update = (controller: AgentWorkspaceViewModel, nextHeight: number) => {
    height = nextHeight;
    top = Math.min(top, Math.max(0, height - 200));
    hook.rerender(controller);
  };
  const scroll = (value: number) => {
    act(() => {
      element.scrollTop = value;
      hook.result.current.onScroll();
    });
  };
  return { ...hook, model, element, update, scroll };
}
afterEach(cleanup);
describe('conversation scrolling', () => {
  it('loads at latest and follows streamed growth', () => {
    const s = setup();
    expect(s.element.scrollTop).toBe(800);
    s.update(
      { ...s.model, run: { ...s.model.run, messages: [{ id: 'stream', text: 'Chunk', status: 'streaming' }] } },
      1200
    );
    expect(s.element.scrollTop).toBe(1000);
  });
  it('does not pull a reader down on streamed growth and offers return to latest', () => {
    const s = setup();
    s.scroll(100);
    s.update(
      { ...s.model, run: { ...s.model.run, messages: [{ id: 'stream', text: 'Chunk', status: 'streaming' }] } },
      1200
    );
    expect(s.element.scrollTop).toBe(100);
    expect(s.result.current.away).toBe(true);
    act(() => s.result.current.jumpToLatest());
    expect(s.element.scrollTop).toBe(1000);
    expect(s.result.current.away).toBe(false);
  });
  it('a new submitted draft returns to latest even when reading history', () => {
    const s = setup();
    s.scroll(100);
    s.update({ ...s.model, draftMessages: [{ id: 'draft', role: 'user', text: 'New question' }] }, 1200);
    expect(s.element.scrollTop).toBe(1000);
  });
  it('completion reload remains at bottom for a following reader', () => {
    const s = setup();
    s.update({ ...s.model, transcript: { status: 'loading', items: [] } }, 200);
    s.update({ ...s.model }, 1300);
    expect(s.element.scrollTop).toBe(1100);
  });
  it('completion reload preserves the historical reader position', () => {
    const s = setup();
    s.scroll(120);
    s.update({ ...s.model, transcript: { status: 'loading', items: [] } }, 200);
    s.update({ ...s.model }, 1000);
    expect(s.element.scrollTop).toBe(120);
  });
  it('prepending older history preserves the viewport position', () => {
    const s = setup();
    s.scroll(120);
    s.update(
      {
        ...s.model,
        transcript: {
          status: 'ready',
          items: [
            { id: 0, sequence: 0, role: 'assistant', text: 'Older', createdAt: null },
            ...s.model.transcript.items
          ]
        }
      },
      1200
    );
    expect(s.element.scrollTop).toBe(320);
  });
  it('switching sessions opens the latest messages', () => {
    const s = setup();
    s.scroll(120);
    s.update({ ...s.model, selectedSessionUid: 'two' }, 1400);
    expect(s.element.scrollTop).toBe(1200);
  });
});
