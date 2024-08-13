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

import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-monitor-select-menu',
  templateUrl: './monitor-select-menu.component.html',
  styleUrls: ['./monitor-select-menu.component.less']
})
export class MonitorSelectMenuComponent {
  @ContentChild('prefix', { static: true }) prefixTemplateRef: TemplateRef<any> | undefined;
  @ContentChild('suffix', { static: true }) suffixTemplateRef: TemplateRef<any> | undefined;
  @Input() data!: any[][];
  @Input() loading!: boolean;
  @Input() selected!: string;
  @Input() listStyle!: string;
  @Input() searchPlaceholder!: string;
  @Output() readonly selectedChanged = new EventEmitter<string>();

  search: string = '';
  dataByFilter: any[][] = [];

  filter(value: string) {
    if (!value) return;
    const lowerCaseValue = value.toLowerCase();
    this.dataByFilter = this.data
      .filter(([_, item]) => item.child.some((child: any) => child.label.toLowerCase().includes(lowerCaseValue)))
      .map(([key, item]) => [
        key,
        { ...item, child: item.child.filter((child: any) => child.label.toLowerCase().includes(lowerCaseValue)) }
      ]);
  }

  onSelectedChanged(selected: string) {
    this.selectedChanged.emit(selected);
  }
}
