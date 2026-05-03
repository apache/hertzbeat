import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSectionHeaderComponent } from './platform-section-header.component';

@Component({
  standalone: true,
  imports: [PlatformSectionHeaderComponent],
  template: `
    <app-platform-section-header kicker="alert" title="Webhook" description="通过统一 header 呈现标题区">
      <button sectionHeaderActions type="button">操作</button>
    </app-platform-section-header>
  `
})
class HostComponent {}

describe('PlatformSectionHeaderComponent', () => {
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
    expect(root.querySelector('.platform-section-header-title')?.textContent).toContain('Webhook');
    expect(root.querySelector('.platform-section-header-description')?.textContent).toContain('统一 header');
    expect(root.querySelector('[sectionHeaderActions]')?.textContent).toContain('操作');
  });
});
