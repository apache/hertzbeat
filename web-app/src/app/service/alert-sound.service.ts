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

@Injectable({
  providedIn: 'root'
})
export class AlertSoundService {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
    this.audio.src = '/assets/audio/default-alert-CN.mp3';
    this.audio.load();
  }

  playAlertSound(lang: string): void {
    if (lang === 'zh-CN' || lang === 'zh-TW') {
      this.audio.src = '/assets/audio/default-alert-CN.mp3';
    } else {
      this.audio.src = '/assets/audio/default-alert-EN.mp3';
    }

    this.audio.load();
    this.audio.play().catch(error => {
      console.warn('Failed to play alert sound:', error);
    });
  }
}
