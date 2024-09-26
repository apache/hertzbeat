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
const category_uri = '/category/all';
const category_page_uri = '/category/page';
const template_download_uri = '/template/download/';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(@Optional() private http: HttpClient) {}

  private categorySubject = new BehaviorSubject<any[]>([]);
  data$ = this.categorySubject.asObservable();

  addCategory(item: any) {
    const currentData = this.categorySubject.getValue();
    this.categorySubject.next([...currentData, item]);
  }

  addCategoryList(arr: any[]) {
    const currentData = this.categorySubject.getValue();
    this.categorySubject.next([...currentData, ...arr]);
  }

  clearCategoryList() {
    this.categorySubject.next([]);
  }

  removeCategory(index: number) {
    const currentData = this.categorySubject.getValue();
    currentData.splice(index, 1);
    this.categorySubject.next([...currentData]);
  }

  updateCategory(index: number, newItem: any) {
    const currentData = this.categorySubject.getValue();
    currentData[index] = newItem;
    this.categorySubject.next([...currentData]);
  }

  getCategoryList() {
    return this.categorySubject.getValue();
  }

  getCategoryByIndex(index:number) {
    return this.categorySubject.getValue().at(index);
  }

  //todo
  public uploadCategory(data: FormData): Observable<Message<any>> {
    //post请求时需要额外设置请求头
    // const httpOptions = {
    //   headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    // };
    //默认接收json的返回值，返回字符串时报错
    return this.http.post<Message<any>>(template_upload_uri, data);
  }

  public getAllCategoryByIsDel(isDel: number): Observable<Message<any>> {
    //默认接收json的返回值，返回字符串时报错
    if(this.http==null){
      console.log('http注册失败，为null')
    }
    return this.http.get<Message<any>>(category_uri+'/'+isDel,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  public getCategoryPage(isDel: number, page:number, size:number): Observable<Message<any>> {
    //默认接收json的返回值，返回字符串时报错
    if(this.http==null){
      console.log('http注册失败，为null')
    }
    return this.http.get<Message<any>>(category_page_uri+'/'+isDel+'?page='+page+'&size='+size,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

  //todo
  public deleteCategory(ownerId: number, templateId: number, version: string): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob'
    };
    //默认接收json的返回值，返回字符串时报错
    return this.http.get<Message<any>>(`${template_download_uri + ownerId}/${templateId}/${version}`, httpOptions);
  }

  //todo
  public modifyCategory(ownerId: number, templateId: number, version: string): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob'
    };
    //默认接收json的返回值，返回字符串时报错
    return this.http.get<Message<any>>(`${template_download_uri + ownerId}/${templateId}/${version}`, httpOptions);
  }

}
