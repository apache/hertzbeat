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

import { describe, expect, it } from 'vitest';

import {
  alertSilenceWeekdayOrder,
  createDefaultAlertSilenceSchedule,
  defaultAlertSilenceDurationMilliseconds
} from './alert-silence-schedule-model';

describe('alert silence schedule model', () => {
  it('names the backend weekday order and six-hour default duration', () => {
    expect(alertSilenceWeekdayOrder).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(defaultAlertSilenceDurationMilliseconds).toBe(21_600_000);

    const start = new Date(2026, 0, 15, 10, 30);
    const schedule = createDefaultAlertSilenceSchedule(start);
    expect(new Date(schedule.periodEnd).getTime() - new Date(schedule.periodStart).getTime()).toBe(
      defaultAlertSilenceDurationMilliseconds
    );
    expect(schedule.days).not.toBe(alertSilenceWeekdayOrder);
  });
});
