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
import {AuthService, LoginDTO, SignUpDTO} from "../../service/auth.service";
import {LocalStorageService} from "../../service/local-storage.service";
import {NzMessageService} from "ng-zorro-antd/message";
import {Router} from "@angular/router";
import {NzButtonComponent} from "ng-zorro-antd/button";
import {DataService} from "../../service/data.service";

@Component({
  selector: 'login',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.less'],
  standalone: true,
  providers: [],
  imports: [
    NzButtonComponent,
    FormsModule
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent implements OnInit,OnDestroy {
  constructor(
    fb: FormBuilder,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
    private msg: NzMessageService,
    private injector: Injector,
    private dataService: DataService,
  ) {}

  SignUpForm: SignUpDTO={
    name:'',
    email:'',
    password:'',
  };

  passwordOk:string='';

  submitSignUp():void{
    // console.log(this.SignUpForm)
    if(this.passwordOk!=this.SignUpForm.password) this.msg.error('密码不一致');
    if(this.SignUpForm.email==null||this.SignUpForm.name==null||this.SignUpForm.password==null) this.msg.error('信息不全');
    this.authService.register(this.SignUpForm).subscribe(response => {
      console.log(response);
      if(response.code == 0) {
        this.msg.success('注册成功');
        // window.history.back();
      }else{
        this.msg.error('注册失败：'+response.msg)
      }
    })
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }
}
