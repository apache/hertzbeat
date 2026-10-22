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

import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { configureShallowTest } from '@testing';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of } from 'rxjs';

import { AuthService } from '../../../../service/auth.service';
import { TokenManagementComponent } from './token-management.component';

describe('API token table pagination', () => {
  let fixture: ComponentFixture<TokenManagementComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let modal: jasmine.SpyObj<NzModalService>;

  const tokens = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `token-${i + 1}`,
      tokenMask: '******MASK',
      creator: 'synthetic-admin',
      gmtCreate: '2026-01-01T00:00:00',
      expireTime: '',
      lastUsedTime: ''
    }));

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['listTokens', 'deleteToken']);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);
    await configureShallowTest(TokenManagementComponent, [CommonModule, FormsModule, NzEmptyModule, NzButtonModule])
      .overrideProvider(AuthService, { useValue: auth })
      .overrideProvider(NzModalService, { useValue: modal })
      .overrideProvider(NzNotificationService, { useValue: jasmine.createSpyObj('notify', ['success', 'error']) })
      .compileComponents();
    fixture = TestBed.createComponent(TokenManagementComponent);
  });

  async function render(count: number) {
    auth.listTokens.and.returnValue(of({ code: 0, msg: '', data: tokens(count) }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  for (const count of [0, 1, 10, 11]) {
    it(`renders ${count} tokens with the proper empty state and pagination`, async () => {
      await render(count);
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelectorAll('tbody tr.ant-table-row').length).toBe(Math.min(count, 10));
      expect(root.textContent?.includes('settings.token.empty')).toBe(count === 0);
      const secondPage = root.querySelector<HTMLElement>('.ant-pagination-item[title="2"]');
      if (count === 11) {
        expect(secondPage).not.toBeNull();
        secondPage!.click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(root.querySelectorAll('tbody tr.ant-table-row').length).toBe(1);
        expect(root.textContent).toContain('token-11');
      } else {
        expect(secondPage).toBeNull();
      }
    });
  }

  it('returns to the remaining page after deleting the last token on page two', async () => {
    await render(11);
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLElement>('.ant-pagination-item[title="2"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    auth.listTokens.and.returnValue(of({ code: 0, msg: '', data: tokens(10) }));
    auth.deleteToken.and.returnValue(of({ code: 0, msg: '', data: null }));
    fixture.componentInstance.confirmDelete(fixture.componentInstance.tokens[10]);
    const confirm = modal.confirm.calls.mostRecent().args[0]!;
    (confirm.nzOnOk as () => void)();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(auth.deleteToken).toHaveBeenCalledWith(11);
    expect(root.querySelectorAll('tbody tr.ant-table-row').length).toBe(10);
    expect(root.textContent).toContain('token-1');
    expect(root.textContent).not.toContain('settings.token.empty');
  });
});
