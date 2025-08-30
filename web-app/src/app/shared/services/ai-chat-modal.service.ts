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

import { Injectable, ComponentRef } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';

import { ChatComponent } from '../components/ai-chat/chat.component';

@Injectable({
  providedIn: 'root'
})
export class AiChatModalService {
  private currentModal: any = null;

  constructor(private modalService: NzModalService) {}

  openChatModal(): void {
    if (this.currentModal) {
      this.currentModal.destroy();
    }

    this.currentModal = this.modalService.create({
      nzTitle: '',
      nzContent: ChatComponent,
      nzFooter: null,
      nzWidth: '90vw',
      nzWrapClassName: 'ai-chat-modal',
      nzCentered: true,
      nzStyle: {
        borderRadius: '16px',
        overflow: 'hidden'
      },
      nzBodyStyle: {
        padding: '0',
        height: '80vh',
        borderRadius: '16px'
      },
      nzMaskClosable: false,
      nzClosable: true,
      nzOnCancel: () => {
        this.currentModal = null;
        return true;
      }
    });
  }

  closeChatModal(): void {
    if (this.currentModal) {
      this.currentModal.destroy();
      this.currentModal = null;
    }
  }
}
