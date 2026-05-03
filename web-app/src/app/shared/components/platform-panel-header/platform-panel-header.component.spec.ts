import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformPanelHeaderComponent } from './platform-panel-header.component';

@Component({
  standalone: true,
  imports: [PlatformPanelHeaderComponent],
  template: `
    <app-platform-panel-header title="证据" description="聚合当前实体的调查入口">
      <button panelHeaderActions type="button">查看日志</button>
    </app-platform-panel-header>
  `
})
class HostComponent {}

describe('PlatformPanelHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render title, description and projected actions', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-panel-header-title')?.textContent).toContain('证据');
    expect(root.querySelector('.platform-panel-header-description')?.textContent).toContain('调查入口');
    expect(root.querySelector('[panelHeaderActions]')?.textContent).toContain('查看日志');
  });
});
