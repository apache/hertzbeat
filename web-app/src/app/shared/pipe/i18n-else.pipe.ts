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
  name: 'i18nElse'
})
export class I18nElsePipe implements PipeTransform {
  constructor(@Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  transform(token: string, elseValue: string): string {
    let i18nValue = this.i18nSvc.fanyi(token);
    if (i18nValue == token) {
      return elseValue;
    }
    return i18nValue;
  }
}
