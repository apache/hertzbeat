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

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface LayoutItem {
  id: number;
  metrics: string;
  position: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private layoutKey = 'dashboard_layout';
  private layoutSubject = new BehaviorSubject<LayoutItem[]>([]);

  constructor() {
    this.loadLayout();
  }

  private loadLayout() {
    const savedLayout = localStorage.getItem(this.layoutKey);
    if (savedLayout) {
      this.layoutSubject.next(JSON.parse(savedLayout));
    }
  }

  saveLayout(items: LayoutItem[]) {
    localStorage.setItem(this.layoutKey, JSON.stringify(items));
    this.layoutSubject.next(items);
  }

  updateItemPosition(id: number, metrics: string, position: { x: number; y: number }) {
    const currentLayout = this.layoutSubject.value;
    const itemIndex = currentLayout.findIndex(item => item.id === id && item.metrics === metrics);

    if (itemIndex > -1) {
      currentLayout[itemIndex].position = position;
    } else {
      currentLayout.push({ id, metrics, position });
    }

    this.saveLayout(currentLayout);
  }

  getLayout() {
    return this.layoutSubject.asObservable();
  }
}
