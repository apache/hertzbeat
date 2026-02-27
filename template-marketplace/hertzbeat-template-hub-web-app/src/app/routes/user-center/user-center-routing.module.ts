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

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserUploadComponent } from './user-upload/user-upload.component';
import {UserAssetsComponent} from "./user-assets/user-assets.component";
import {AssetsDetailComponent} from "./assets-detail/assets-detail.component";
import {UserStarComponent} from "./user-star/user-star.component";

const routes: Routes = [
  { path: '', component: UserUploadComponent },
  { path: 'upload', component: UserUploadComponent },
  { path: 'assets', component: UserAssetsComponent },
  { path: 'detail', component: AssetsDetailComponent },
  { path: 'star', component: UserStarComponent },
  { path: '**', component: UserUploadComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserCenterRoutingModule {}
