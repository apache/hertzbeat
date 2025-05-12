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

import { Component, OnInit } from '@angular/core';
import { I18NService } from '@core';

import { AiBotService, ChatMessage } from '../../services/ai-bot.service';

@Component({
  selector: 'app-ai-bot',
  templateUrl: './ai-bot.component.html',
  styleUrls: ['./ai-bot.component.less']
})
export class AiBotComponent implements OnInit {
  isOpen = false;
  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;

  constructor(private aiBotService: AiBotService, private i18nSvc: I18NService) {}

  ngOnInit(): void {
    // add greeting message
    this.messages.push({
      content: this.i18nSvc.fanyi('ai.bot.greeting'),
      isUser: false,
      timestamp: new Date()
    });
    console.log('The AI assistant component has loaded.');
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    if (!this.currentMessage.trim()) return;

    // add user message
    this.messages.push({
      content: this.currentMessage,
      isUser: true,
      timestamp: new Date()
    });

    const userMessage = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // call service to fetch AI response
    this.aiBotService.sendMessage(userMessage).subscribe(response => {
      this.messages.push(response);
      this.isLoading = false;
    });
  }
}
