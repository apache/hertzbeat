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

export type AgentPermissionSnapshot = {
  sessionUid: string;
  mode: 'MANUAL' | 'FULL';
  expiresAt: number;
  serverNow: number;
  fullAllowed: boolean;
};
export type AgentPermissionChallenge = {
  sessionUid: string;
  challengeId: string;
  generation: number;
  notBefore: number;
  expiresAt: number;
  serverNow: number;
  noticeVersion: number;
};
export type AgentPermissionControl = {
  phase: 'unselected' | 'loading' | 'ready' | 'error';
  mode: 'MANUAL' | 'FULL';
  expiresAt?: number;
  fullAllowed: boolean;
  dialogOpen: boolean;
  busy: boolean;
  acknowledged: boolean;
  remainingSeconds: number;
  challengeExpired: boolean;
  confirmAllowed: boolean;
  error: boolean;
  actions: {
    requestFull: () => Promise<void>;
    confirm: () => Promise<void>;
    revoke: () => Promise<void>;
    dismiss: () => void;
    acknowledge: (value: boolean) => void;
    reload: () => Promise<void>;
  };
};
export function permissionReviewRemaining(challenge: AgentPermissionChallenge, receivedAt: number, now: number) {
  return Math.ceil(Math.max(0, challenge.notBefore - challenge.serverNow - Math.max(0, now - receivedAt)) / 1000);
}
export function permissionChallengeExpired(challenge: AgentPermissionChallenge, receivedAt: number, now: number) {
  return Math.max(0, now - receivedAt) >= challenge.expiresAt - challenge.serverNow;
}
export function effectivePermissionMode(snapshot: AgentPermissionSnapshot, receivedAt: number, now: number) {
  return snapshot.mode === 'FULL' && snapshot.expiresAt - snapshot.serverNow > Math.max(0, now - receivedAt)
    ? 'FULL'
    : 'MANUAL';
}
