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
  //'[{"label":"GET请求","value":"GET"},{"label":"PUT请求","value":"PUT"}]'
  options!: any[];
  // 当type为key-value时有效,表示别名描述
  keyAlias!: string;
  valueAlias!: string;
  // 此参数是否隐藏 即默认不显示, 在高级设置区显示
  hide: boolean = false;
  // Map of dependent params
  depend: Map<string, List<any>> | undefined;
}
