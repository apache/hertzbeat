import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformStageMetaHeaderComponent } from './platform-stage-meta-header.component';

@Component({
  standalone: true,
  imports: [PlatformStageMetaHeaderComponent],
  template: `
    <app-platform-stage-meta-header
      title="结果"
      description="当前时间窗内的查询结果"
      [metaItems]="[
        { text: '总数 · 12', tone: 'accent' },
        { text: '已选择 · 2', tone: 'critical', monospace: true }
      ]"
    >
      <button stageMetaHeaderActions type="button">操作</button>
    </app-platform-stage-meta-header>
  `
})
class HostComponent {}

describe('PlatformStageMetaHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render title, description, meta chips and projected actions', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-stage-meta-header-title')?.textContent).toContain('结果');
    expect(root.querySelector('.platform-stage-meta-header-description')?.textContent).toContain('当前时间窗');
    expect(root.querySelectorAll('.platform-stage-meta-chip').length).toBe(2);
    expect(root.querySelector('.platform-stage-meta-chip--critical')?.textContent).toContain('已选择');
    expect(root.querySelector('[stageMetaHeaderActions]')?.textContent).toContain('操作');
  });
});
