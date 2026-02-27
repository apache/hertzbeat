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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const AI_API_URI = '/ai';

@Injectable({
  providedIn: 'root'
})
export class AiBotService {
  constructor(private http: HttpClient) {
    console.log('AI Assistant Service Initialized');
  }

  /**
   * Send message to AI and get response
   */
  sendMessage(message: string): Observable<ChatMessage> {
    console.log('Sending message to AI:', message);

    // Create a Subject for handling streaming response
    const responseSubject = new Subject<ChatMessage>();

    // Build request body
    const requestBody = { text: message };

    // Send initial message
    responseSubject.next({
      content: 'Thinking...',
      isUser: false,
      timestamp: new Date()
    });

    // Send POST request using HttpClient
    this.http
      .post(`${AI_API_URI}/get`, requestBody, {
        responseType: 'text',
        headers: new HttpHeaders({
          Accept: 'text/event-stream',
          'Content-Type': 'application/json'
        })
      })
      .pipe(
        tap(response => console.log('Received AI response, length:', response.length)),
        catchError(error => {
          console.error('AI request failed:', error);

          // Provide friendly error message
          responseSubject.next({
            content: `Sorry, the AI service is temporarily unavailable. Please try again later.\nError details: ${this.getErrorMessage(
              error
            )}`,
            isUser: false,
            timestamp: new Date()
          });

          responseSubject.complete();
          return throwError(() => error);
        })
      )
      .subscribe(response => {
        console.log('Received complete response');

        // Check if response is in SSE format
        if (response.includes('data:')) {
          // Process SSE format response
          this.processSSEResponse(response, responseSubject);
        } else {
          // If not SSE format, send response directly
          responseSubject.next({
            content: response,
            isUser: false,
            timestamp: new Date()
          });
          responseSubject.complete();
        }
      });

    return responseSubject.asObservable();
  }

  /**
   * Process SSE format response data
   */
  private processSSEResponse(response: string, subject: Subject<ChatMessage>): void {
    const lines = response.split('\n');
    let fullMessage = '';
    const dataChunks = [];

    // First collect all data: lines
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data:')) {
        // Extract content after data:
        const content = trimmedLine.substring(5).trim();
        if (content) {
          dataChunks.push(content);
        }
      }
    }

    console.log(`Found ${dataChunks.length} data chunks`);

    // If no valid data chunks found, send original response
    if (dataChunks.length === 0) {
      subject.next({
        content: response,
        isUser: false,
        timestamp: new Date()
      });
      subject.complete();
      return;
    }

    // Simulate streaming effect: send a chunk every 100ms
    dataChunks.forEach((chunk, index) => {
      setTimeout(() => {
        // Accumulate message
        fullMessage += chunk;

        // Send updated message
        subject.next({
          content: fullMessage,
          isUser: false,
          timestamp: new Date()
        });

        // If this is the last chunk, complete the stream
        if (index === dataChunks.length - 1) {
          subject.complete();
        }
      }, index * 100);
    });
  }

  /**
   * Get readable error message from error object
   */
  private getErrorMessage(error: any): string {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return `Client error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      if (error.status === 401) {
        return 'Authentication failed, please log in again';
      } else if (error.status === 403) {
        return 'You do not have permission to access this feature';
      } else {
        return `Server error: ${error.status} ${error.statusText}`;
      }
    } else {
      // Other errors
      return error.message || 'Unknown error';
    }
  }
}
