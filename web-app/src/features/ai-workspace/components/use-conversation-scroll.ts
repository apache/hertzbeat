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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

type Position = { top: number; height: number; anchor?: { key: string; offset: number } };
const BOTTOM_TOLERANCE = 48;

export function useConversationScroll(controller: AgentWorkspaceViewModel) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const position = useRef<Position>({ top: 0, height: 0 });
  const previous = useRef<{ session?: string; draft?: string; first?: number; loading: boolean }>({ loading: false });
  const loading = controller.transcript.status === 'loading';
  const loadingRef = useRef(loading);
  const [away, setAway] = useState(false);
  const jumpToLatest = () => {
    const element = viewport.current;
    following.current = true;
    setAway(false);
    if (element) element.scrollTop = element.scrollHeight;
  };
  const onScroll = () => {
    const element = viewport.current;
    if (!element || loadingRef.current) return;
    following.current = distanceToBottom(element) <= BOTTOM_TOLERANCE;
    setAway(!following.current);
    position.current = readPosition(element);
  };
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const prior = previous.current;
    const draft = controller.draftMessages.at(-1)?.id;
    const first = controller.transcript.items[0]?.id;
    const { reset, prepended } = scrollChanges(prior, controller);
    loadingRef.current = loading;
    if (reset) following.current = true;
    if (!loading) {
      if (following.current) element.scrollTop = element.scrollHeight;
      else if (prior.loading || prepended) restorePosition(element, position.current);
      position.current = readPosition(element);
    }
    previous.current = {
      ...(controller.selectedSessionUid ? { session: controller.selectedSessionUid } : {}),
      ...(draft ? { draft } : {}),
      ...(first !== undefined ? { first } : {}),
      loading
    };
  }, [controller, loading]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const element = viewport.current;
      if (!element || loadingRef.current) return;
      if (following.current) element.scrollTop = element.scrollHeight;
      setAway(!following.current && distanceToBottom(element) > BOTTOM_TOLERANCE);
    });
    if (content.current) observer.observe(content.current);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  return { viewportRef: viewport, contentRef: content, onScroll, away, jumpToLatest };
}

function distanceToBottom(element: HTMLElement) {
  return Math.max(0, element.scrollHeight - element.clientHeight - element.scrollTop);
}

function readPosition(element: HTMLElement): Position {
  const top = element.getBoundingClientRect().top;
  const anchor = [...element.querySelectorAll<HTMLElement>('[data-message-key]')].find(
    message => message.getBoundingClientRect().bottom > top
  );
  return {
    top: element.scrollTop,
    height: element.scrollHeight,
    ...(anchor ? { anchor: { key: anchor.dataset.messageKey!, offset: anchor.getBoundingClientRect().top - top } } : {})
  };
}

function restorePosition(element: HTMLElement, position: Position) {
  const anchor = [...element.querySelectorAll<HTMLElement>('[data-message-key]')].find(
    message => message.dataset.messageKey === position.anchor?.key
  );
  element.scrollTop =
    anchor && position.anchor
      ? element.scrollTop +
        anchor.getBoundingClientRect().top -
        element.getBoundingClientRect().top -
        position.anchor.offset
      : position.top + Math.max(0, element.scrollHeight - position.height);
}

function scrollChanges(
  prior: { session?: string; draft?: string; first?: number },
  controller: AgentWorkspaceViewModel
) {
  const draft = controller.draftMessages.at(-1)?.id;
  const adoptingSession = prior.session === undefined && draft !== undefined && controller.streaming;
  const switched = prior.session !== controller.selectedSessionUid && !adoptingSession;
  const sent = draft !== undefined && draft !== prior.draft;
  const prepended =
    controller.transcript.items[0]?.id !== prior.first &&
    controller.transcript.items.some(item => item.id === prior.first);
  return { reset: switched || sent, prepended };
}
