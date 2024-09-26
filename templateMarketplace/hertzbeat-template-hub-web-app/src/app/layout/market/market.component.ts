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

import { Component } from '@angular/core';
import { LayoutDefaultOptions } from '@delon/theme/layout-default';
import { environment } from "@env/environment";
import {RouterOutlet} from "@angular/router";
// import img from "../../../assets/img/logo/hertzbeat-brand.png";
import {NzImageDirective} from "ng-zorro-antd/image";

@Component({
  selector: 'app-market',
  templateUrl: 'market.component.html',
  standalone: true,
  imports: [
    RouterOutlet,
    NzImageDirective
  ]
})
export class LayoutMarketComponent {
  options: LayoutDefaultOptions = {
    logoExpanded: `./assets/brand_white.svg`,
    logoCollapsed: `./assets/logo.svg`
  };
  avatar: string = `./assets/img/avatar.svg`;
  showSettingDrawer = !environment.production;
  currentYear = new Date().getFullYear();

  // logoImg=img;

  constructor() {}
}
