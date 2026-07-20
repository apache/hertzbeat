/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { messageServerQueryKeys } from './message-server-query-keys';

describe('Message Server Query Keys', () => {
  it('preserves the established cache identity of each fixed backend resource', () => {
    expect(messageServerQueryKeys.email()).toEqual(['config', 'email']);
    expect(messageServerQueryKeys.sms()).toEqual(['config', 'sms']);
  });
});
