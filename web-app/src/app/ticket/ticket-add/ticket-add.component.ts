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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService } from '../../service/ticket.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { StatusOption, TicketOrder } from '../../pojo/TicketOrder';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../service/user.service';

@Component({
  selector: 'app-ticket-add',
  templateUrl: './ticket-add.component.html',
  styleUrls: ['./ticket-add.component.scss']
})
export class TicketAddComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  statusOptions: StatusOption[] = [];
  priorityOptions: StatusOption[] = [];
  users: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ticketService: TicketService,
    private userService: UserService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadStatusOptions();
    this.loadPriorityOptions();
    this.loadUsers();
    
    this.form = this.fb.group({
      title: [null, [Validators.required]],
      content: [null, [Validators.required]],
      assigneeId: [null, [Validators.required]],
      status: [0, [Validators.required]],
      priority: [1, [Validators.required]]
    });
  }

  loadStatusOptions(): void {
    this.ticketService.getStatusOptions().subscribe(res => {
      if (res.code === 0) {
        this.statusOptions = res.data;
      } else {
        this.message.error(res.msg || '加载状态选项失败');
      }
    });
  }

  loadPriorityOptions(): void {
    this.ticketService.getPriorityOptions().subscribe(res => {
      if (res.code === 0) {
        this.priorityOptions = res.data;
      } else {
        this.message.error(res.msg || '加载优先级选项失败');
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(res => {
      if (res.code === 0) {
        this.users = res.data?.content || [];
      } else {
        this.message.error(res.msg || '加载用户列表失败');
      }
    });
  }

  submitForm(): void {
    if (this.form.invalid) {
      for (const i in this.form.controls) {
        this.form.controls[i].markAsDirty();
        this.form.controls[i].updateValueAndValidity();
      }
      return;
    }
    
    const selectedUser = this.users.find(user => user.id === this.form.value.assigneeId);
    
    const ticket: TicketOrder = {
      id: 0,
      alertId: 0,
      monitorId: 0,
      assigneeId: this.form.value.assigneeId,
      assigneeName: selectedUser?.username || '',
      title: this.form.value.title,
      content: this.form.value.content,
      status: this.form.value.status,
      solution: '',
      priority: this.form.value.priority,
      gmtCreate: new Date().getTime(),
      gmtUpdate: new Date().getTime()
    };
    
    this.loading = true;
    this.ticketService.createTicket(ticket)
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        res => {
          if (res.code === 0) {
            this.message.success('创建工单成功');
            this.router.navigate(['/ticket']);
          } else {
            this.message.error(res.msg || '创建工单失败');
          }
        },
        error => {
          this.message.error('创建工单失败，网络错误');
          console.error(error);
        }
      );
  }

  goBack(): void {
    this.router.navigate(['/ticket']);
  }
} 