/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { browserAlertNotificationRuntime, type BrowserAlertNotificationRuntime } from './browser-alert-notification';

describe('browser alert notification runtime', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports unsupported browsers without throwing', async () => {
    vi.stubGlobal('Notification', undefined);

    expect(browserAlertNotificationRuntime.readPermission()).toBe('unsupported');
    await expect(browserAlertNotificationRuntime.requestPermission()).resolves.toBe('unsupported');
  });

  it('shows generic notification evidence and delegates the click action', () => {
    const close = vi.fn();
    const focus = vi.fn();
    const instances: Array<{ onclick: (() => void) | null }> = [];
    class NotificationStub {
      static permission = 'granted';
      onclick: (() => void) | null = null;
      close = close;
      constructor(
        readonly title: string,
        readonly options: NotificationOptions
      ) {
        instances.push(this);
      }
    }
    vi.stubGlobal('Notification', NotificationStub);
    vi.stubGlobal('window', { focus });
    const onClick = vi.fn();

    browserAlertNotificationRuntime.show({
      title: 'HertzBeat alert',
      body: 'A new active alert needs attention.',
      icon: '/assets/logo.svg',
      onClick
    });
    instances[0]?.onclick?.();

    expect(focus).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('swallows browser audio rejection instead of creating an unhandled failure', async () => {
    const play = vi.fn().mockRejectedValue(new Error('autoplay blocked'));
    vi.stubGlobal(
      'Audio',
      class {
        play = play;
      }
    );

    expect(() => browserAlertNotificationRuntime.playSound('/assets/audio/default-alert-EN.mp3')).not.toThrow();
    await Promise.resolve();
    expect(play).toHaveBeenCalledOnce();
  });

  it('keeps the injectable runtime contract structurally small', () => {
    const runtime: BrowserAlertNotificationRuntime = {
      readPermission: () => 'default',
      requestPermission: () => Promise.resolve('denied'),
      show: vi.fn(),
      playSound: vi.fn()
    };
    expect(runtime.readPermission()).toBe('default');
  });
});
