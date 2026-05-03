import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { DrawerPayload } from '../../../core/ops-workspace/ops-workspace.types';
import { RightDrawerComponent } from './right-drawer.component';

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'dashboard.severity.critical': '严重',
      'alert.status.firing': '告警中',
      'entity.status.degraded': '降级',
      'right.drawer.status.impacted': '受影响',
      'right.drawer.status.success': '成功'
    };
    return map[key] ?? key;
  }
}

@Component({
  standalone: true,
  imports: [RightDrawerComponent],
  template: `
    <app-right-drawer [payload]="payload" [visible]="visible" (closed)="closed = true"></app-right-drawer>
  `
})
class TestHostComponent {
  visible = true;
  closed = false;
  payload: DrawerPayload = {
    kind: 'entity',
    title: 'checkout-api',
    subtitle: 'Service',
    status: 'critical',
    sections: [
      { label: 'Owner', value: 'platform' },
      { label: 'Status', value: 'critical' }
    ]
  };
}

describe('RightDrawerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: ALAIN_I18N_TOKEN, useClass: MockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render payload details and emit close events', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.ops-right-drawer-title')?.textContent).toContain('checkout-api');
    expect(root.querySelectorAll('.ops-right-drawer-section').length).toBe(2);
    expect(root.querySelector('.ops-right-drawer-status')?.textContent).toContain('严重');

    (root.querySelector('.ops-right-drawer-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(host.closed).toBeTrue();
  });
});
