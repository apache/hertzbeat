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

export class Alert {
  id!: number;
  target!: string;
  monitorId!: number;
  monitorName!: string;
  // alert level -- 0:high-emergency-red 1:medium-critical-orange 2:low-warning-yellow
  priority: number = 2;
  // alert status-- 0-to be processed 1-not reached the threshold 2-recover 3-processed
  status!: number;
  content!: string;
  // alarm times
  times!: number;
  firstAlarmTime!: number;
  lastAlarmTime!: number;
  tags!: Record<string, string>;
  gmtCreate!: number;
  gmtUpdate!: number;
  tmp!: any;
}
