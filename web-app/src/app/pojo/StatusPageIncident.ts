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

import { StatusPageComponent } from './StatusPageComponent';
import { StatusPageIncidentContent } from './StatusPageIncidentContent';

export class StatusPageIncident {
  id!: number;
  orgId!: number;
  name!: string;
  // incident current state: 0-Investigating 1-Identified 2-Monitoring 3-Resolved
  state: number = 0;
  // incident start Investigating timestamp
  startTime!: number;
  // incident end Resolved timestamp
  endTime!: number;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;

  components!: StatusPageComponent[];
  contents!: StatusPageIncidentContent[];
}
