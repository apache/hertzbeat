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

export class StatusPageComponent {
  id!: number;
  orgId!: number;
  name!: string;
  description!: string;
  labels!: Record<string, string>;
  // calculate status method: 0-auto 1-manual
  method: number = 0;
  // config state when use manual method: 0-Normal 1-Abnormal 2-unknown
  configState: number = 0;
  // component status when use auto method: 0-Normal 1-Abnormal 2-unknown
  state: number = 0;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
