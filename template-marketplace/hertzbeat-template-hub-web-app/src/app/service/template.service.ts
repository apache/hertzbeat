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

export interface TemplateVO {
  id: number;
  name: string;
  description: string;
  latest: number;
  user: number;
  categoryId: number;
  tag:number;
  download: number;
  star:number,
  create_time: string;
  update_time: string;
  off_shelf: number;
  isDel: number;
  starByNowUser:boolean;
}

const template_count_uri = '/template/count';
const template_upload_uri = '/template/upload';
const template_page_uri = '/template/page';
const template_page_name_uri='/template/page/name';
const template_page_option_uri='/template/page/option';
const template_page_order_uri='/template/page/order';
const template_page_user_uri='/template/page/user';
const template_download_uri = '/template/download/';
const template_download_latest_uri = '/template/download/latest/';
const template_page_category_uri = '/template/page/category';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  constructor(@Optional() private http: HttpClient) {}

  private templateSubject = new BehaviorSubject<any[]>([]);
  private nowTemplateSubject=new BehaviorSubject<any>('');

  setNowTemplate(id:number){
    console.log(this.getTemplateById(id));
    this.nowTemplateSubject.next(this.getTemplateById(id));
  }

  getNowTemplate(){
    return this.nowTemplateSubject.value;
  }

  setTemplateSubject(item: any[]) {
    this.clearTemplateSubject();
    this.templateSubject.next([...item]);
  }

  clearTemplateSubject(){
    this.templateSubject.next([]);
  }

  getTemplateById(id:number) {
    for (const item of this.templateSubject.getValue()) {
      if (item.id === id) {
        return item;
      }
    }
    return null;
  }

  public upload(data: FormData): Observable<Message<any>> {
    return this.http.post<Message<any>>(template_upload_uri, data);
  }

  public getTemplatePage(isDel: number, userId:number, page:number, size:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(template_page_uri+'/'+isDel+'/'+userId+'?page='+page+'&size='+size,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  public getTemplatePageByUser(userId: number, page:number, size:number): Observable<Message<any>> {
    return this.http.get<Message<any>>(template_page_user_uri+'/'+userId+'?page='+page+'&size='+size,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  public getTemplatePageByOption(userId:number, allCategory:boolean,category: number[],nameLike:string,orderOption:number,
                                 isDel: number, page:number, size:number): Observable<Message<any>> {
    var categoryStr='';
    for (const id of category) {
      categoryStr+=id+'_';
    }
    categoryStr=categoryStr.substring(0,categoryStr.length-1);
    if(page<0){
      page=0;
    }
    if(nameLike!=''){
      if(allCategory){
        return this.http.get<Message<any>>(template_page_name_uri+'/'+nameLike+'/'+isDel+'/'+orderOption+'/'+userId+'?page='+page+'&size='+size+'&category='+category,
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
      else if(!allCategory){
        return this.http.get<Message<any>>(template_page_option_uri+'/'+nameLike+'/'+categoryStr+'/'+isDel+'/'+orderOption+'/'+userId+'?page='+page+'&size='+size+'&category='+category,
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
      else{
        return this.http.get<Message<any>>(template_page_option_uri+'/'+nameLike+'/'+categoryStr+'/'+isDel+'/'+orderOption+'/'+userId+'?page='+page+'&size='+size+'&category='+category,
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
    }
    else{
      if(allCategory){
        return this.http.get<Message<any>>(
          template_page_order_uri+'/'+orderOption+'/'+isDel+'/'+userId+'?page='+page+'&size='+size+'',
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
      else if(!allCategory&&category.length>0){
        return this.http.get<Message<any>>(
          template_page_category_uri+'/'+categoryStr+'/'+isDel+'/'+orderOption+'/'+userId+'?page='+page+'&size='+size+'',
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
      else{
        return this.http.get<Message<any>>(
          template_page_category_uri+'/'+'_'+'/'+isDel+'/'+orderOption+'/'+userId+'?page='+page+'&size='+size+'',
          {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
      }
    }
  }

  public getTemplateCount(isDel:number, offshelf:number): Observable<any> {
    return this.http.get<Message<number>>(`${template_count_uri}/${isDel}/${offshelf}`);
  }

  public downloadTemplate(ownerId: number, templateId: number, version: string, versionId:number): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob'
    };
    return this.http.get<Blob>(`${template_download_uri + ownerId}/${templateId}/${version}/${versionId}`,
      httpOptions);
  }

  public downloadLatestTemplate(user: number, templateId: number, latest: number): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob'
    };
    return this.http.get<Blob>(`${template_download_latest_uri + user}/${templateId}/${latest}`, httpOptions);
  }

}
