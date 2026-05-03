/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ElapsedTimePipe } from './elapsed-time.pipe';

describe('ElapsedTimePipe', () => {
  it('create an instance', () => {
    const pipe = new ElapsedTimePipe({ fanyi: (key: string) => key } as any);
    expect(pipe).toBeTruthy();
  });

  it('should render localized chinese elapsed time copy', () => {
    const map: Record<string, string> = {
      'common.time.just-now': '刚刚',
      'common.time.minute-ago': '{{count}} 分钟前',
      'common.time.minutes-ago': '{{count}} 分钟前',
      'common.time.hour-ago': '{{count}} 小时前',
      'common.time.hours-ago': '{{count}} 小时前',
      'common.time.day-ago': '{{count}} 天前',
      'common.time.days-ago': '{{count}} 天前'
    };
    const pipe = new ElapsedTimePipe({
      fanyi: (key: string, params?: Record<string, string | number>) =>
        (map[key] ?? key).replace(/\{\{(\w+)}}/g, (_match, token) => String(params?.[token] ?? ''))
    } as any);

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    expect(pipe.transform(twoHoursAgo)).toBe('2 小时前');
  });
});
