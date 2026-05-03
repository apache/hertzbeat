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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { of } from 'rxjs';

import { AlertIntegrationComponent } from './alert-integration.component';

describe('AlertIntegrationComponent', () => {
  let component: AlertIntegrationComponent;
  let fixture: ComponentFixture<AlertIntegrationComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertIntegrationComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMarkdown(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ source: 'webhook' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertIntegrationComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpTesting.match(() => true).forEach(request => {
      if (request.request.url.includes('/assets/doc/alert-integration/webhook.')) {
        request.flush('# Webhook');
        return;
      }
      if (request.request.url.endsWith('.svg')) {
        request.flush('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        return;
      }
      request.flush('');
    });
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render inside the shared page shell', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-page-shell')).not.toBeNull();
  });
});
