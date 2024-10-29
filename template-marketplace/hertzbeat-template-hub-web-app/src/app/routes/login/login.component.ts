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

import {Component, Injector, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormsModule} from '@angular/forms';
import {AuthService, LoginDTO} from "../../service/auth.service";
import {LocalStorageService} from "../../service/local-storage.service";
import {NzMessageService} from "ng-zorro-antd/message";
import {Router} from "@angular/router";
import {NzButtonComponent} from "ng-zorro-antd/button";
import {DataService} from "../../service/data.service";

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  standalone: true,
  providers: [],
  imports: [
    NzButtonComponent,
    FormsModule
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit,OnDestroy {
  constructor(
    fb: FormBuilder,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
    private msg: NzMessageService,
    private injector: Injector,
    private dataService: DataService,
  ) {}

  loginForm: LoginDTO={
    type:1,
    identifier:'',
    credential:'',
  };

  submitLogin():void{
    console.log(this.loginForm)
    this.authService.tryLogin(this.loginForm).subscribe(response => {
      if(response.code == 0) {
        console.log(response);
        this.localStorageService.storageAuthorizationToken(response.data.token);
        this.localStorageService.storageRefreshToken(response.data.refreshToken);
        this.msg.success('登录成功');
        this.localStorageService.putData('userInfo',this.loginForm.identifier);
        this.localStorageService.putData('userId',response.data.id);
        this.dataService.sendLoginMsg(true);
        window.history.back();
      }else{
        this.msg.error('登录失败：'+response.msg)
      }
    })
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }
}
