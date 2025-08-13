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

export interface OpenAiConfig {
  enable: boolean;
  apiKey: string;
}

export interface OpenAiConfigStatus {
  configured: boolean;
  hasDbConfig: boolean;
  hasYamlConfig: boolean;
  validationPassed: boolean;
  validationMessage: string;
}

const openai_config_uri = '/ai-agent/config';

@Injectable({
  providedIn: 'root'
})
export class OpenAiConfigService {
  constructor(private http: HttpClient) {}

  public saveOpenAiConfig(config: OpenAiConfig): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${openai_config_uri}/openai`, config);
  }

  public getOpenAiConfig(): Observable<Message<OpenAiConfig>> {
    return this.http.get<Message<OpenAiConfig>>(`${openai_config_uri}/openai`);
  }

  public getOpenAiConfigStatus(): Observable<Message<OpenAiConfigStatus>> {
    return this.http.get<Message<OpenAiConfigStatus>>(`${openai_config_uri}/openai/status`);
  }
}