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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { Message } from '../pojo/Message';
import { LocalStorageService } from './local-storage.service';

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  gmtCreate: Date;
}

export interface ChatConversation {
  id: number;
  title: string;
  gmtCreated: Date;
  gmtUpdate: Date;
  messages: ChatMessage[];
}

export interface ChatRequestContext {
  message: string;
  conversationId?: number;
}

const chat_uri = '/chat';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  constructor(private http: HttpClient, private localStorageService: LocalStorageService) {}

  /**
   * Create a new conversation
   */
  createConversation(): Observable<Message<ChatConversation>> {
    return this.http.post<Message<ChatConversation>>(`${chat_uri}/conversations`, {});
  }

  /**
   * Get all conversations
   */
  getConversations(): Observable<Message<ChatConversation[]>> {
    return this.http.get<Message<ChatConversation[]>>(`${chat_uri}/conversations`);
  }

  /**
   * Get a specific conversation with its history
   */
  getConversation(conversationId: number): Observable<Message<ChatConversation>> {
    return this.http.get<Message<ChatConversation>>(`${chat_uri}/conversations/${conversationId}`);
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: number): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${chat_uri}/conversations/${conversationId}`);
  }

  /**
   * Send a message and get streaming response
   */
  streamChat(message: string, conversationId?: number): Observable<ChatMessage> {
    const responseSubject = new Subject<ChatMessage>();

    const requestBody: ChatRequestContext = { message };
    if (conversationId) {
      requestBody.conversationId = conversationId;
    }

    const token = this.localStorageService.getAuthorizationToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache'
    };

    // Add Authorization header like the interceptor does
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use fetch for SSE streaming (HttpClient doesn't support true streaming)
    fetch(`/api${chat_uri}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): Promise<void> {
          if (!reader) {
            return Promise.resolve();
          }
          return reader.read().then(({ value, done }) => {
            if (done) {
              responseSubject.complete();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });

            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data:')) {
                const jsonStr = trimmedLine.substring(5).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const data = JSON.parse(jsonStr);
                    if (data.response !== undefined) {
                      responseSubject.next({
                        content: data.response || '',
                        role: 'assistant',
                        gmtCreate: data.timestamp ? new Date(data.timestamp) : new Date()
                      });
                    }
                  } catch (parseError) {
                    console.error('Error parsing SSE data:', parseError, 'Raw data:', jsonStr);
                    if (jsonStr) {
                      responseSubject.next({
                        content: jsonStr,
                        role: 'assistant',
                        gmtCreate: new Date()
                      });
                    }
                  }
                }
              }
            }

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        console.error('Chat stream error:', error);
        responseSubject.error(error);
      });

    return responseSubject.asObservable();
  }
}
