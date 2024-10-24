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

import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable, Optional} from '@angular/core';
import {Observable} from 'rxjs';

import {Message} from '../pojo/Message';

const template_upload_uri = '/template/upload';
const version_page_uri = '/version/page';
const version_get_uri = '/version/get';
const share_uri='/share/getShareURL';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  constructor(@Optional() private http: HttpClient) {}

  public upload(data: FormData): Observable<Message<any>> {
    return this.http.post<Message<any>>(template_upload_uri, data);
  }

  public getVersion(id: number): Observable<Message<any>> {
    return this.http.get<Message<any>>(version_get_uri+'/'+id);
  }

  public getVersionPage(templateId :number, isDel: number, page:number, size:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(version_page_uri+'/'+templateId+'/'+isDel+'?page='+page+'&size='+size,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  public shareVersion(versionId:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(share_uri+'/'+versionId,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

}
