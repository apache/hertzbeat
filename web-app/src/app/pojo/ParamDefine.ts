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

import { List } from 'echarts';

export class ParamDefine {
  name!: string;
  field!: string;
  type!: string;
  required: boolean = false;
  defaultValue: string | undefined;
  placeholder!: string;
  range: string | undefined;
  limit: number | undefined;
  options!: any[];
  // key alias. This param is valid when the type is key-value
  keyAlias!: string;
  valueAlias!: string;
  // whether the param is hidden, default is false
  hide: boolean = false;
  // Map of dependent params
  depend: Map<string, List<any>> | undefined;
}
