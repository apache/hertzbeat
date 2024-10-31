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

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {Message} from '../pojo/Message';

const auth_login_uri = '/auth/login';
const auth_refresh_uri = '/auth/refresh';
const auth_register_uri = '/auth/register';

export interface LoginDTO {
  type:number,
  identifier:string,
  credential:string,
}

export interface SignUpDTO {
  name:string,
  email:string,
  password:string,
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  public tryLogin(data: LoginDTO): Observable<Message<any>> {
    return this.http.post<Message<any>>(auth_login_uri,data);
  }

  public register(data:SignUpDTO): Observable<Message<any>> {
    return this.http.post<Message<any>>(auth_register_uri,data);
  }

  public refreshToken(refreshToken: string): Observable<Message<any>> {
    return this.http.post<Message<any>>(auth_refresh_uri, {"token":refreshToken});
  }

}
