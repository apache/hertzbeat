import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSupportPanelComponent } from './platform-support-panel.component';

@Component({
  standalone: true,
  imports: [PlatformSupportPanelComponent],
  template: `
    <app-platform-support-panel title="支持区" subtitle="补充说明" actionLabel="展开查看">
      <div class="content">内容</div>
    </app-platform-support-panel>
  `
})
class HostComponent {}

describe('PlatformSupportPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render title, subtitle and projected content', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-support-panel-title')?.textContent).toContain('支持区');
    expect(root.querySelector('.platform-support-panel-subtitle')?.textContent).toContain('补充说明');
    expect(root.querySelector('.content')?.textContent).toContain('内容');
  });
});
