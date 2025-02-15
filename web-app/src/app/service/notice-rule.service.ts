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

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { NoticeRule } from '../pojo/NoticeRule';
import { Page } from '../pojo/Page';

const notice_rule_uri = '/notice/rule';
const notice_rules_uri = '/notice/rules';

@Injectable({
  providedIn: 'root'
})
export class NoticeRuleService {
  constructor(private http: HttpClient) {}

  public newNoticeRule(body: NoticeRule): Observable<Message<any>> {
    return this.http.post<Message<any>>(notice_rule_uri, body);
  }

  public editNoticeRule(body: NoticeRule): Observable<Message<any>> {
    return this.http.put<Message<any>>(notice_rule_uri, body);
  }

  public deleteNoticeRule(ruleId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${notice_rule_uri}/${ruleId}`);
  }

  public getNoticeRules(name: string, pageIndex: number, pageSize: number): Observable<Message<Page<NoticeRule>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    let httpParams = new HttpParams();
    httpParams = httpParams.append('pageIndex', pageIndex);
    httpParams = httpParams.append('pageSize', pageSize);
    if (name != undefined && name != null && name != '') {
      httpParams = httpParams.append('name', name);
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<NoticeRule>>>(notice_rules_uri, options);
  }

  public getNoticeRuleById(ruleId: number): Observable<Message<NoticeRule>> {
    return this.http.get<Message<NoticeRule>>(`${notice_rule_uri}/${ruleId}`);
  }
}
