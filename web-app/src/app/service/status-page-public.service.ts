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
import { StatusPageComponentStatus } from '../pojo/StatusPageComponentStatus';
import { StatusPageIncident } from '../pojo/StatusPageIncident';
import { StatusPageOrg } from '../pojo/StatusPageOrg';

const status_page_org_public_uri = '/status/page/public/org';

const status_page_component_public_uri = '/status/page/public/component';

const status_page_incident_public_uri = '/status/page/public/incident';

@Injectable({
  providedIn: 'root'
})
export class StatusPagePublicService {
  constructor(private http: HttpClient) {}

  public getStatusPageOrg(): Observable<Message<StatusPageOrg>> {
    return this.http.get<Message<StatusPageOrg>>(status_page_org_public_uri);
  }

  public getStatusPageComponents(): Observable<Message<StatusPageComponentStatus[]>> {
    return this.http.get<Message<StatusPageComponentStatus[]>>(status_page_component_public_uri);
  }

  public getStatusPageComponent(componentId: number): Observable<Message<StatusPageComponentStatus>> {
    return this.http.get<Message<StatusPageComponentStatus>>(`${status_page_component_public_uri}/${componentId}`);
  }

  public getStatusPageIncidents(): Observable<Message<StatusPageIncident[]>> {
    return this.http.get<Message<StatusPageIncident[]>>(status_page_incident_public_uri);
  }
}
