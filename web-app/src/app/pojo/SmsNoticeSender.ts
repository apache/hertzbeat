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

import { AlibabaSmsConfig } from './AlibabaSmsConfig';
import { AwsSmsConfig } from './AwsSmsConfig';
import { SmslocalSmsConfig } from './SmslocalSmsConfig';
import { TencentSmsConfig } from './TencentSmsConfig';
import { TwilioSmsConfig } from './TwilioSmsConfig';
import { UniSmsConfig } from './UniSmsConfig';
import { SmsType } from './enums/sms-type.enum';

export class SmsNoticeSender {
  id!: number;
  type: SmsType = SmsType.TENCENT;
  tencent: TencentSmsConfig = new TencentSmsConfig();
  alibaba: AlibabaSmsConfig = new AlibabaSmsConfig();
  unisms: UniSmsConfig = new UniSmsConfig();
  smslocal: SmslocalSmsConfig = new SmslocalSmsConfig();
  aws: AwsSmsConfig = new AwsSmsConfig();
  twilio: TwilioSmsConfig = new TwilioSmsConfig();
  enable: boolean = false;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
