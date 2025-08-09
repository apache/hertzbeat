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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';

const general_config_uri = '/config';

@Injectable({
  providedIn: 'root'
})
export class GeneralConfigService {
  constructor(private http: HttpClient) {}

  public saveGeneralConfig(body: any, type: string): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${general_config_uri}/${type}`, body);
  }

  public getGeneralConfig(type: string): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${general_config_uri}/${type}`);
  }

  public updateAppTemplateConfig(body: any, app: string): Observable<Message<void>> {
    return this.http.put<Message<void>>(`${general_config_uri}/template/${app}`, body);
  }

  public getTimezones(): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${general_config_uri}/timezones`);
  }
}
