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

export class ObjectStore<T> {
  type: ObjectStoreType = ObjectStoreType.DATABASE;
  config!: T;
  appDefineStoreType!: ObjectStoreType;
}

export enum ObjectStoreType {
  /**
   * Local file
   */
  FILE = 'FILE',

  /**
   * Local database
   */
  DATABASE = 'DATABASE',

  /**
   * <a href="https://support.huaweicloud.com/obs/index.html">Huawei cloud OBS</a>
   */
  OBS = 'OBS'
}

export class ObsConfig {
  accessKey!: string;
  secretKey!: string;
  bucketName!: string;
  endpoint!: string;
  savePath: string = 'hertzbeat';
}
