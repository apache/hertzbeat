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

export type BrowserAlertPermission = NotificationPermission | 'unsupported';

export type BrowserAlertNotificationRuntime = {
  readPermission: () => BrowserAlertPermission;
  requestPermission: () => Promise<BrowserAlertPermission>;
  show: (notification: { title: string; body: string; icon: string; onClick: () => void }) => void;
  playSound: (source: string) => void;
};

export const browserAlertNotificationRuntime: BrowserAlertNotificationRuntime = {
  readPermission() {
    return notificationApi()?.permission ?? 'unsupported';
  },
  async requestPermission() {
    const api = notificationApi();
    if (!api) return 'unsupported';
    try {
      return await api.requestPermission();
    } catch {
      return 'unsupported';
    }
  },
  show({ title, body, icon, onClick }) {
    const api = notificationApi();
    if (!api || api.permission !== 'granted') return;
    try {
      const notification = new api(title, { body, icon });
      notification.onclick = () => {
        globalThis.window?.focus();
        onClick();
        notification.close();
      };
    } catch {
      // Notification policy failures must not break the shared SSE owner.
    }
  },
  playSound(source) {
    if (typeof Audio === 'undefined') return;
    try {
      const playback = new Audio(source).play();
      void playback.catch(() => undefined);
    } catch {
      // Browser media policy owns playback admission; alerts remain visible.
    }
  }
};

function notificationApi() {
  return typeof Notification === 'undefined' ? null : Notification;
}
