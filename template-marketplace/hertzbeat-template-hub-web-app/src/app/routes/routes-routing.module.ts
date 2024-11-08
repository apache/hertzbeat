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

import {Routes} from '@angular/router';
import {LayoutMarketComponent} from '../layout/market/market.component';
import {HomePageComponent} from './home-page/home-page.component';
import {LoginComponent} from './login/login.component';
import {SignUpComponent} from "./sign-up/sign-up.component";

export const routes: Routes = [
  {
    path: '',
    component: LayoutMarketComponent,
    children: [
      { path: '', redirectTo: 'home-page', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'home-page', component: HomePageComponent },
      { path: 'market', loadChildren: () => import('./market/market.module').then(m => m.MarketModule) },
      { path: 'user-center', loadChildren: () => import('./user-center/user-center.module').then(m => m.UserCenterModule) }
    ]
  },
  { path: '**', redirectTo: 'exception/404' }
];
