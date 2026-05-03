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

import { Inject, Pipe, PipeTransform } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

@Pipe({
  standalone: false,  name: 'elapsedTime'
})
export class ElapsedTimePipe implements PipeTransform {
  constructor(@Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  transform(value: any, ...args: unknown[]): any {
    let timestamp = 0;
    if (value instanceof Date) {
      timestamp = value.getTime();
    } else if (typeof value === 'number') {
      timestamp = value;
    } else if (typeof value === 'string') {
      timestamp = new Date(value).getTime();
    }

    const now = new Date().getTime();
    const diffSeconds = Math.floor((now - timestamp) / 1000); // Convert milliseconds to seconds
    const minutes = Math.floor(diffSeconds / 60); // Extract minutes
    const hours = Math.floor(minutes / 60); // Extract hours
    const days = Math.floor(hours / 24); // Extract days
    if (days > 0) {
      return this.i18nSvc.fanyi(days > 1 ? 'common.time.days-ago' : 'common.time.day-ago', { count: days });
    } else if (hours > 0) {
      return this.i18nSvc.fanyi(hours > 1 ? 'common.time.hours-ago' : 'common.time.hour-ago', { count: hours });
    } else if (minutes > 0) {
      return this.i18nSvc.fanyi(minutes > 1 ? 'common.time.minutes-ago' : 'common.time.minute-ago', { count: minutes });
    } else {
      return this.i18nSvc.fanyi('common.time.just-now');
    }
  }
}
