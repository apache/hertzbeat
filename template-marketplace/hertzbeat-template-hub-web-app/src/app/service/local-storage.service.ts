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

import { Injectable } from '@angular/core';

const AuthorizationConst = 'Authorization';
const RefreshTokenConst = 'refresh-token';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  constructor() {}

  public putData(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  public removeData(key: string) {
    localStorage.removeItem(key);
  }

  public getData(key: string): string | null {
    const data = localStorage.getItem(key);
    return data === null ? null : data;
  }

  public getAuthorizationToken(): string | null {
    return this.getData(AuthorizationConst);
  }

  public getRefreshToken(): string | null {
    return this.getData(RefreshTokenConst);
  }

  public storageRefreshToken(token: string) {
    return this.putData(RefreshTokenConst, token);
  }

  public storageAuthorizationToken(token: string) {
    return this.putData(AuthorizationConst, token);
  }

  public hasAuthorizationToken() {
    return localStorage.getItem(AuthorizationConst) != null;
  }
}
