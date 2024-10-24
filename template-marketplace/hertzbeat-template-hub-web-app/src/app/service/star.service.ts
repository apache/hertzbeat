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
import {BehaviorSubject, Observable} from 'rxjs';

import {Message} from '../pojo/Message';

const template_star_uri = '/template/star';
const star_page_user_uri='/star/page/user';
const star_user_uri='/star';
const star_isStar_uri='/star/isStar';
const star_cancel_uri='/star/cancel';

@Injectable({
  providedIn: 'root'
})
export class StarService {
  constructor(@Optional() private http: HttpClient) {}

  public getTemplatePageByUserStar(userId: number, page:number, size:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(star_page_user_uri+'/'+userId+'?page='+page+'&size='+size);
  }

  public getTemplateIdsByUser(userId: number): Observable<Message<any>> {
    return this.http.get<Message<any>>(star_user_uri+'/'+userId);
  }

  public assertTemplateStarByUser(userId: number,template:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(star_isStar_uri+'/'+userId+'/'+template);
  }

  public cancelStarTemplate(userId: number, data:FormData): Observable<Message<any>> {
    return this.http.post<Message<any>>(star_cancel_uri+'/'+userId,data);
  }

  public starTemplate(data:FormData): Observable<Message<any>> {
    return this.http.post<Message<any>>(template_star_uri,data);
  }

}
