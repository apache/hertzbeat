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

const category_uri = '/category/all';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(@Optional() private http: HttpClient) {}

  private categorySubject = new BehaviorSubject<any[]>([]);

  addCategoryList(arr: any[]) {
    const currentData = this.categorySubject.getValue();
    this.categorySubject.next([...currentData, ...arr]);
  }

  clearCategoryList() {
    this.categorySubject.next([]);
  }

  getCategoryList() {
    return this.categorySubject.getValue();
  }

  public getAllCategoryByIsDel(isDel: number): Observable<Message<any>> {
    if(this.http==null){
      console.log('http注册失败，为null')
    }
    return this.http.get<Message<any>>(category_uri+'/'+isDel,
      {headers: new HttpHeaders({ 'Content-Type': 'application/json' }), responseType: 'json'});
  }

}
