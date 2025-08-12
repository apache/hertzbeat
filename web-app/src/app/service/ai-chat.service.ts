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

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ConversationDto {
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface ChatRequestContext {
  message: string;
  conversationId?: string;
}

const chat_uri = '/chat';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  constructor(private http: HttpClient) {}

  /**
   * Create a new conversation
   */
  createConversation(): Observable<Message<ConversationDto>> {
    console.log('Creating new conversation at:', `${chat_uri}/conversations`);
    return this.http.post<Message<ConversationDto>>(`${chat_uri}/conversations`, {});
  }

  /**
   * Get all conversations
   */
  getConversations(): Observable<Message<ConversationDto[]>> {
    return this.http.get<Message<ConversationDto[]>>(`${chat_uri}/conversations`);
  }

  /**
   * Get a specific conversation with its history
   */
  getConversation(conversationId: string): Observable<Message<ConversationDto>> {
    return this.http.get<Message<ConversationDto>>(`${chat_uri}/conversations/${conversationId}`);
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${chat_uri}/conversations/${conversationId}`);
  }

  /**
   * Send a message and get streaming response
   */
  streamChat(message: string, conversationId?: string): Observable<ChatMessage> {
    const responseSubject = new Subject<ChatMessage>();

    const requestBody: ChatRequestContext = { message };
    if (conversationId) {
      requestBody.conversationId = conversationId;
    }

    console.log('Sending stream chat request to:', `${chat_uri}/stream`);
    console.log('Request body:', requestBody);

    // Use fetch API with streaming support for POST requests with SSE
    fetch(`/api/${chat_uri}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(requestBody)
    }).then(response => {
      console.log('Stream response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();

      function readStream(): Promise<void> {
        if (!reader) {
          return Promise.resolve();
        }
        return reader.read().then(({ value, done }) => {
          if (done) {
            console.log('Stream completed');
            responseSubject.complete();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk);

          // Process the SSE chunk
          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              const jsonStr = trimmedLine.substring(5).trim();
              if (jsonStr && jsonStr !== '[DONE]') {
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.response) {
                    responseSubject.next({
                      content: data.response,
                      role: 'assistant',
                      timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
                    });
                  }
                } catch (parseError) {
                  console.error('Error parsing SSE data:', parseError);
                  // If not JSON, treat as plain text
                  responseSubject.next({
                    content: jsonStr,
                    role: 'assistant',
                    timestamp: new Date()
                  });
                }
              }
            }
          }

          return readStream();
        });
      }

      return readStream();
    }).catch(error => {
      console.error('Chat stream error:', error);
      responseSubject.next({
        content: `Sorry, there was an error processing your request: ${error.message}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      });
      responseSubject.complete();
    });

    return responseSubject.asObservable();
  }

}
