import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { AuthService } from '../../../../service/auth.service';
import { TokenManagementComponent } from './token-management.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    const map: Record<string, string> = {
      'settings.token.console.kicker': 'OTLP Token',
      'settings.token.console.title': 'Token 管理',
      'settings.token.console.copy': '统一管理采集与导入令牌。',
      'settings.token.console.result.total': '总数',
      'settings.token.console.result.active': '活跃',
      'settings.token.console.result.expired': '过期'
    };
    return map[value] ?? value;
  }
}

describe('TokenManagementComponent', () => {
  let fixture: ComponentFixture<TokenManagementComponent>;

  beforeEach(async () => {
    const authSvc = jasmine.createSpyObj<AuthService>('AuthService', ['listTokens', 'generateToken', 'deleteToken']);
    authSvc.listTokens.and.returnValue(
      of({
        code: 0,
        data: []
      } as any)
    );

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      declarations: [TokenManagementComponent, MockI18nPipe],
      providers: [
        { provide: AuthService, useValue: authSvc },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['success', 'warning', 'error']) },
        { provide: NzModalService, useValue: jasmine.createSpyObj('NzModalService', ['confirm']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TokenManagementComponent);
    fixture.detectChanges();
  });

  it('should render token management inside app-page-shell', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.textContent).toContain('总数');
    expect(root.textContent).toContain('活跃');
    expect(root.textContent).toContain('过期');
  });
});
