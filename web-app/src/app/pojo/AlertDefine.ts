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

export class AlertDefine {
  id!: number;
  name!: string;
  // realtime, periodic
  type: string = 'realtime';
  // datasource when type is periodic, promql | sql
  datasource: string = 'promql';
  expr!: string;
  // unit second
  period: number = 300;
  times: number = 3;
  // severity: info, warning, critical, emergency, fatal
  labels!: Record<string, string>;
  annotations!: Record<string, string>;
  enable: boolean = true;
  template!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
  priority: number = 2;
}
