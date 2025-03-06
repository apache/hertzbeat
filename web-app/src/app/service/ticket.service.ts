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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from '../pojo/Message';
import { TicketOrder, StatusOption } from '../pojo/TicketOrder';
import { Page } from '../pojo/Page';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  constructor(private http: HttpClient) {}

  getTickets(
    status: string | null,
    search: string | null,
    sort: string,
    order: string,
    pageIndex: number,
    pageSize: number
  ): Observable<Message<Page<TicketOrder>>> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('order', order)
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());
    
    if (status != null) {
      params = params.set('status', status);
    }
    if (search != null) {
      params = params.set('search', search);
    }

    return this.http.get<Message<Page<TicketOrder>>>('/api/ticket', { params });
  }

  getTicketById(id: number): Observable<Message<TicketOrder>> {
    return this.http.get<Message<TicketOrder>>(`/api/ticket/${id}`);
  }

  getTicketsByAssignee(assigneeId: number, status?: number): Observable<Message<TicketOrder[]>> {
    let params = new HttpParams();
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }
    return this.http.get<Message<TicketOrder[]>>(`/api/ticket/assignee/${assigneeId}`, { params });
  }

  createTicket(ticket: TicketOrder): Observable<Message<void>> {
    return this.http.post<Message<void>>('/api/ticket', ticket);
  }

  updateTicket(ticket: TicketOrder): Observable<Message<void>> {
    return this.http.put<Message<void>>('/api/ticket', ticket);
  }

  updateTicketStatus(id: number, status: number, solution?: string): Observable<Message<void>> {
    let params = new HttpParams().set('status', status.toString());
    if (solution) {
      params = params.set('solution', solution);
    }
    return this.http.put<Message<void>>(`/api/ticket/status/${id}`, null, { params });
  }

  deleteTickets(ids: number[]): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`/api/ticket/${ids.join(',')}`);
  }

  getStatusOptions(): Observable<Message<StatusOption[]>> {
    return this.http.get<Message<StatusOption[]>>('/api/ticket/status-options');
  }

  getPriorityOptions(): Observable<Message<StatusOption[]>> {
    return this.http.get<Message<StatusOption[]>>('/api/ticket/priority-options');
  }
} 