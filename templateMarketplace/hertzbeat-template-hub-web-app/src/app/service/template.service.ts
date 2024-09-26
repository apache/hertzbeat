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

import { HttpClient, HttpParams, HttpHeaders, HttpContext } from '@angular/common/http';
import {Injectable, Optional} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

import { Message } from '../pojo/Message';

const template_upload_uri = '/template/upload';
const template_get_uri = '/template/';
const template_uri = '/template/page';
const template_download_uri = '/template/download/';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  constructor(@Optional() private http: HttpClient) {}

  private templateSubject = new BehaviorSubject<any[]>([]);
  public nowTemplateIndex: number = 0;
  data$ = this.templateSubject.asObservable();

  addTemplate(item: any) {
    const currentData = this.templateSubject.getValue();
    this.templateSubject.next([...currentData, item]);
  }

  removeTemplate(index: number) {
    const currentData = this.templateSubject.getValue();
    currentData.splice(index, 1);
    this.templateSubject.next([...currentData]);
  }

  updateTemplate(index: number, newItem: any) {
    const currentData = this.templateSubject.getValue();
    currentData[index] = newItem;
    this.templateSubject.next([...currentData]);
  }

  getTemplates() {
    return this.templateSubject.getValue();
  }

  getTemplateByIndex(index:number) {
    return this.templateSubject.getValue().at(index);
  }

  public upload(data: FormData): Observable<Message<any>> {
    // const httpOptions = {
    //   headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    // };
    //默认接收json的返回值，返回字符串时报错
    return this.http.post<Message<any>>(template_upload_uri, data);
  }

  public getAllTemplateByUser(userId: number): Observable<Message<any>> {
    // const httpOptions = {
    //   headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    // };
    return this.http.get<Message<any>>(template_get_uri + userId);
  }

  public getTemplatePage(isDel: number, page:number, size:number): Observable<Message<any>> {
    if(this.http==null){
      console.log('http注册失败，为null')
    }
    return this.http.get<Message<any>>(template_uri+'/'+isDel+'?page='+page+'&size='+size,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  public downloadTemplate(ownerId: number, templateId: number, version: string): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob'
    };
    return this.http.get<Message<any>>(`${template_download_uri + ownerId}/${templateId}/${version}`, httpOptions);
  }

}
