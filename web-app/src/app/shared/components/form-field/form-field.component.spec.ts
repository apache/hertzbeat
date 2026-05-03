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

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

import { FormFieldComponent } from './form-field.component';

@Component({
  standalone: false,
  template: `<app-form-field [item]="item" [(ngModel)]="value"></app-form-field>`
})
class HostFormFieldComponent {
  item: any = {
    field: 'port',
    type: 'number'
  };
  value: any = undefined;
}

@Component({
  standalone: false,
  template: `<form [formGroup]="form"><app-form-field [item]="item" formControlName="port"></app-form-field></form>`
})
class ReactiveHostFormFieldComponent {
  item: any = {
    field: 'port',
    type: 'number'
  };
  form = new FormGroup({
    port: new FormControl(undefined)
  });
}

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, NzInputNumberModule],
      declarations: [FormFieldComponent, HostFormFieldComponent, ReactiveHostFormFieldComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    component.item = {
      field: 'field',
      type: 'text'
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize undefined values to null for number fields', () => {
    component.item = {
      field: 'port',
      type: 'number'
    };

    component.writeValue(undefined);

    expect(component.value).toBeNull();
  });

  it('should render number fields without throwing when initial value is undefined', () => {
    component.item = {
      field: 'port',
      type: 'number'
    };
    component.value = undefined;

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should not throw when used as a control value accessor with an undefined number value', () => {
    const hostFixture = TestBed.createComponent(HostFormFieldComponent);

    expect(() => hostFixture.detectChanges()).not.toThrow();
  });

  it('should not throw when reactive forms set an undefined number value through the control accessor', () => {
    const hostFixture = TestBed.createComponent(ReactiveHostFormFieldComponent);

    expect(() => hostFixture.detectChanges()).not.toThrow();
  });
});
