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

import { Component, ContentChild, TemplateRef, AfterContentInit, Input } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.less']
})
export class ToolbarComponent {
  @ContentChild('left', { static: true }) leftTemplateRef: TemplateRef<any> | undefined;
  @ContentChild('right', { static: true }) rightTemplateRef: TemplateRef<any> | undefined;
  @ContentChild('center', { static: true }) centerTemplateRef: TemplateRef<any> | undefined;
  @Input() wrapperClass: string = '';
  @Input() wrapperStyle: string = '';
  @Input() containerClass: string = '';
  @Input() containerStyle: string = '';
  @Input() leftClass: string = '';
  @Input() leftStyle: string = '';
  @Input() rightClass: string = '';
  @Input() rightStyle: string = '';
  @Input() centerClass: string = '';
  @Input() centerStyle: string = '';
}
