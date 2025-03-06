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
import { TicketService } from '../../service/ticket.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TicketOrder, StatusOption } from '../../pojo/TicketOrder';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-list',
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {
  tickets: TicketOrder[] = [];
  selectedTickets: TicketOrder[] = [];
  
  statusOptions: StatusOption[] = [];
  priorityOptions: StatusOption[] = [];
  
  // Search and filter options
  searchValue: string | null = null;
  statusFilter: string | null = null;
  
  // Pagination
  pageIndex = 0;
  pageSize = 8;
  total = 0;
  
  // Table state
  loading = false;
  sortField = 'gmtCreate';
  sortOrder = 'desc';
  
  constructor(
    private ticketService: TicketService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.loadStatusOptions();
    this.loadPriorityOptions();
    this.loadTickets();
  }

  loadStatusOptions(): void {
    this.ticketService.getStatusOptions().subscribe(res => {
      if (res.code === 0) {
        this.statusOptions = res.data;
      } else {
        this.message.error(res.msg || 'Failed to load status options');
      }
    });
  }

  loadPriorityOptions(): void {
    this.ticketService.getPriorityOptions().subscribe(res => {
      if (res.code === 0) {
        this.priorityOptions = res.data;
      } else {
        this.message.error(res.msg || 'Failed to load priority options');
      }
    });
  }

  loadTickets(): void {
    this.loading = true;
    this.ticketService
      .getTickets(
        this.statusFilter,
        this.searchValue,
        this.sortField,
        this.sortOrder,
        this.pageIndex,
        this.pageSize
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        res => {
          if (res.code === 0) {
            this.tickets = res.data.content;
            this.total = res.data.totalElements;
          } else {
            this.message.error(res.msg || 'Failed to load tickets');
          }
        },
        error => {
          this.message.error('Failed to load tickets due to network error');
          console.error(error);
        }
      );
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadTickets();
  }

  onStatusFilterChange(): void {
    this.pageIndex = 0;
    this.loadTickets();
  }

  onPageIndexChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadTickets();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageIndex = 0;
    this.loadTickets();
  }

  onSortChange(sortInfo: { field: string; order: string }): void {
    this.sortField = sortInfo.field;
    this.sortOrder = sortInfo.order === 'ascend' ? 'asc' : 'desc';
    this.loadTickets();
  }

  onSelectChange(selectedTickets: TicketOrder[]): void {
    this.selectedTickets = selectedTickets;
  }

  deleteTickets(ids: number[]): void {
    this.modal.confirm({
      nzTitle: 'Are you sure you want to delete these tickets?',
      nzContent: 'This action cannot be undone.',
      nzOkText: 'Yes',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.loading = true;
        this.ticketService
          .deleteTickets(ids)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe(
            res => {
              if (res.code === 0) {
                this.message.success('Tickets deleted successfully');
                this.selectedTickets = [];
                this.loadTickets();
              } else {
                this.message.error(res.msg || 'Failed to delete tickets');
              }
            },
            error => {
              this.message.error('Failed to delete tickets due to network error');
              console.error(error);
            }
          );
      },
      nzCancelText: 'No'
    });
  }

  deleteSelected(): void {
    const ids = this.selectedTickets.map(ticket => ticket.id);
    this.deleteTickets(ids);
  }

  updateTicketStatus(id: number, status: number): void {
    this.loading = true;
    this.ticketService
      .updateTicketStatus(id, status)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        res => {
          if (res.code === 0) {
            this.message.success('Ticket status updated successfully');
            this.loadTickets();
          } else {
            this.message.error(res.msg || 'Failed to update ticket status');
          }
        },
        error => {
          this.message.error('Failed to update ticket status due to network error');
          console.error(error);
        }
      );
  }

  getStatusLabel(status: number): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Unknown';
  }

  getPriorityLabel(priority: number): string {
    const option = this.priorityOptions.find(opt => opt.value === priority);
    return option ? option.label : 'Unknown';
  }

  getPriorityColor(priority: number): string {
    switch (priority) {
      case 0: // HIGH
        return 'red';
      case 1: // MEDIUM
        return 'orange';
      case 2: // LOW
        return 'green';
      default:
        return 'blue';
    }
  }

  getStatusColor(status: number): string {
    switch (status) {
      case 0: // OPEN
        return 'blue';
      case 1: // IN_PROGRESS
        return 'processing';
      case 2: // RESOLVED
        return 'success';
      case 3: // CLOSED
        return 'default';
      default:
        return 'default';
    }
  }
} 