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

import { describe, expect, it } from 'vitest';

import styles from './alert-center.module.css?raw';

describe('Alert Center selection style contract', () => {
  it('keeps checked and partially checked table boxes visibly filled', () => {
    expect(styles).toContain('.ant-checkbox-checked .ant-checkbox-inner');
    expect(styles).toContain('.ant-checkbox-indeterminate .ant-checkbox-inner');
    expect(styles).toMatch(/ant-checkbox-checked[\s\S]*background:\s*var\(--hb-brand-accent\)/);
  });

  it('uses one flat diagnostic action strip with durable interaction targets', () => {
    expect(styles).toContain('.diagnosticActions');
    expect(styles).toContain('.diagnosticPrimary');
    expect(styles).toContain('.diagnosticSecondary');
    expect(styles).toMatch(/\.diagnosticActions[\s\S]*min-height:\s*32px/);
    expect(styles).toMatch(/\.diagnosticPrimary,[\s\S]*\.diagnosticSecondary[\s\S]*height:\s*30px/);
  });
});
