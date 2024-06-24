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

import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { NzSizeLDSType } from 'ng-zorro-antd/core/types';

@Component({
  selector: 'app-multi-func-input',
  templateUrl: './multi-func-input.component.html',
  styleUrls: ['./multi-func-input.component.less']
})
export class MultiFuncInputComponent implements OnInit {
  constructor() {}

  @Input() value!: any;
  @Input() groupStyle!: string;
  @Input() inputStyle!: string;
  @Input() placeholder!: string;
  @Input() allowClear: boolean = true;
  @Input() type: string = 'text';
  @Input() size: NzSizeLDSType = 'default';
  @Output() readonly valueChange = new EventEmitter<string>();

  inputValue: any | undefined;

  ngOnInit(): void {
    this.inputValue = this.value;
  }

  onChange() {
    if (this.inputValue !== this.value) {
      this.valueChange.emit(this.inputValue);
    }
  }
}
