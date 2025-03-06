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
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from '../../service/ticket.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TicketOrder, StatusOption } from '../../pojo/TicketOrder';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss']
})
export class TicketDetailComponent implements OnInit {
  ticketId!: number;
  ticket!: TicketOrder;
  form!: FormGroup;
  loading = false;
  isEditing = false;
  statusOptions: StatusOption[] = [];
  priorityOptions: StatusOption[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private ticketService: TicketService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadStatusOptions();
    this.loadPriorityOptions();
    
    this.route.params.subscribe(params => {
      this.ticketId = +params['id'];
      if (this.ticketId) {
        this.loadTicket();
      }
    });
    
    this.form = this.fb.group({
      title: [null, [Validators.required]],
      content: [null, [Validators.required]],
      status: [null, [Validators.required]],
      solution: [null],
      priority: [null, [Validators.required]]
    });
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

  loadTicket(): void {
    this.loading = true;
    this.ticketService.getTicketById(this.ticketId)
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        res => {
          if (res.code === 0) {
            this.ticket = res.data;
            this.populateForm();
          } else {
            this.message.error(res.msg || 'Failed to load ticket');
          }
        },
        error => {
          this.message.error('Failed to load ticket due to network error');
          console.error(error);
        }
      );
  }

  populateForm(): void {
    this.form.patchValue({
      title: this.ticket.title,
      content: this.ticket.content,
      status: this.ticket.status,
      solution: this.ticket.solution,
      priority: this.ticket.priority
    });
    this.form.markAsPristine();
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.populateForm();
  }

  saveChanges(): void {
    if (this.form.invalid) {
      for (const i in this.form.controls) {
        this.form.controls[i].markAsDirty();
        this.form.controls[i].updateValueAndValidity();
      }
      return;
    }
    
    const updatedTicket = {
      ...this.ticket,
      title: this.form.value.title,
      content: this.form.value.content,
      status: this.form.value.status,
      solution: this.form.value.solution,
      priority: this.form.value.priority
    };
    
    this.loading = true;
    this.ticketService.updateTicket(updatedTicket)
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        res => {
          if (res.code === 0) {
            this.message.success('Ticket updated successfully');
            this.isEditing = false;
            this.loadTicket();
          } else {
            this.message.error(res.msg || 'Failed to update ticket');
          }
        },
        error => {
          this.message.error('Failed to update ticket due to network error');
          console.error(error);
        }
      );
  }

  goBack(): void {
    this.router.navigate(['/ticket']);
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