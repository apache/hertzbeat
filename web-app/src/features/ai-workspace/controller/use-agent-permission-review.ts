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

import { useEffect, useState, useRef } from 'react';
import {
  permissionChallengeExpired,
  permissionReviewRemaining,
  type AgentPermissionChallenge
} from '../model/agent-permission-mode';

type ReceivedChallenge = { challenge: AgentPermissionChallenge; receivedAt: number; requestId: string };
export function useAgentPermissionReview(
  sessionUid: string | undefined,
  mode: string | undefined,
  challenge: ReceivedChallenge | undefined,
  changing: boolean,
  challengePending: boolean
) {
  const dialog = usePermissionDialog(sessionUid);
  const ui = dialog.ui;
  const [now, setNow] = useState(Date.now);
  const dialogOpen = ui.sessionUid === sessionUid && ui.open;
  useEffect(() => {
    if (!dialogOpen && mode !== 'FULL') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [dialogOpen, mode]);
  const current =
    challenge !== undefined &&
    challenge.challenge.sessionUid === sessionUid &&
    ui.sessionUid === sessionUid &&
    challenge.requestId === ui.requestId
      ? challenge
      : undefined;
  const busy = changing || (dialogOpen && challengePending);
  const remainingSeconds = current ? permissionReviewRemaining(current.challenge, current.receivedAt, now) : 5;
  const expired = Boolean(current && permissionChallengeExpired(current.challenge, current.receivedAt, now));
  const acknowledged = ui.sessionUid === sessionUid && ui.ack;
  return {
    now,
    current,
    busy,
    dialogOpen,
    remainingSeconds,
    expired,
    acknowledged,
    confirmAllowed: canConfirm({ dialogOpen, current, remainingSeconds, expired, acknowledged, busy }),
    close: dialog.close,
    open: () => {
      setNow(Date.now());
      return dialog.open();
    },
    acknowledge: dialog.acknowledge
  };
}

function usePermissionDialog(sessionUid: string | undefined) {
  const [ui, setUi] = useState({ sessionUid, open: false, ack: false, requestId: '' });
  const transport = useRef<{ sessionUid: string | undefined; requestId: string; controller: AbortController }>();
  useEffect(
    () => () => {
      if (transport.current?.sessionUid === sessionUid) transport.current?.controller.abort();
    },
    [sessionUid]
  );
  return {
    ui,
    close: () => {
      if (transport.current?.sessionUid === sessionUid && transport.current?.requestId === ui.requestId)
        transport.current?.controller.abort();
      setUi(previous =>
        previous.sessionUid === sessionUid && previous.requestId === ui.requestId
          ? { ...previous, open: false, ack: false, requestId: '' }
          : previous
      );
    },
    open: () => {
      transport.current?.controller.abort();
      const controller = new AbortController();
      const requestId = crypto.randomUUID();
      transport.current = { sessionUid, requestId, controller };
      setUi({ sessionUid, open: true, ack: false, requestId });
      return { requestId, signal: controller.signal };
    },
    acknowledge: (ack: boolean) =>
      setUi(previous =>
        previous.sessionUid === sessionUid && previous.requestId === ui.requestId ? { ...previous, ack } : previous
      )
  };
}

function canConfirm(state: {
  dialogOpen: boolean;
  current: ReceivedChallenge | undefined;
  remainingSeconds: number;
  expired: boolean;
  acknowledged: boolean;
  busy: boolean;
}) {
  return Boolean(
    state.dialogOpen &&
    state.current &&
    state.remainingSeconds === 0 &&
    !state.expired &&
    state.acknowledged &&
    !state.busy
  );
}
