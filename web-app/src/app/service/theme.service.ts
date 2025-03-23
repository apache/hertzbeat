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

import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';

  constructor(@Inject(DOCUMENT) private doc: any) {}

  setTheme(theme: string): void {
    localStorage.setItem(this.themeKey, theme);
  }

  getTheme(): string | null {
    return localStorage.getItem(this.themeKey);
  }

  changeTheme(theme: string | null): void {
    if (theme == null) {
      theme = this.getTheme();
    }
    const style = this.doc.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';

    if (theme === 'dark') {
      style.id = 'dark-theme';
      style.href = 'assets/style.dark.css';
    } else if (theme === 'compact') {
      style.id = 'compact-theme';
      style.href = 'assets/style.compact.css';
    } else {
      const darkDom = this.doc.getElementById('dark-theme');
      if (darkDom) darkDom.remove();

      const compactDom = this.doc.getElementById('compact-theme');
      if (compactDom) compactDom.remove();
      return;
    }

    this.setTheme(theme);

    // remove old theme
    const existingLink = this.doc.getElementById(style.id);
    if (existingLink) {
      existingLink.remove();
    }

    // add new theme
    this.doc.body.appendChild(style);
    this.doc.body.setAttribute('data-theme', theme);
  }
}
