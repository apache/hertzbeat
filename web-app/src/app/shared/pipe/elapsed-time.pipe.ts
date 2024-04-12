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

import { Pipe, PipeTransform } from '@angular/core';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({
  name: 'elapsedTime'
})
export class ElapsedTimePipe implements PipeTransform {
  transform(value: any, ...args: unknown[]): any {
    let timestamp = 0;
    if (value instanceof Date) {
      timestamp = value.getTime();
    } else if (typeof value === 'string') {
      timestamp = new Date(value).getTime();
    }

    const now = new Date().getTime();
    const diffSeconds = Math.floor((now - timestamp) / 1000); // Convert milliseconds to seconds
    const minutes = Math.floor(diffSeconds / 60); // Extract minutes
    const hours = Math.floor(minutes / 60); // Extract hours
    const days = Math.floor(hours / 24); // Extract days
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }
}
