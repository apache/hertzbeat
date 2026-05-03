import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerToolbarComponent } from './platform-drawer-toolbar.component';

@Component({
  standalone: true,
  imports: [PlatformDrawerToolbarComponent],
  template: `
    <app-platform-drawer-toolbar [badges]="['JSON']" [meta]="[{ text: 'trace-123', monospace: true }]">
      <button drawerToolbarLeading type="button">YAML</button>
      <button drawerToolbarActions type="button">复制</button>
    </app-platform-drawer-toolbar>
  `
})
class TestHostComponent {}

describe('PlatformDrawerToolbarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should render leading actions, badges, actions and monospace metadata', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-drawer-toolbar-leading button')?.textContent).toContain('YAML');
    expect(root.querySelectorAll('.platform-drawer-toolbar-badge').length).toBe(1);
    expect(root.querySelectorAll('.platform-drawer-toolbar-meta').length).toBe(1);
    expect(root.querySelector('.platform-drawer-toolbar-meta.is-monospace')?.textContent).toContain('trace-123');
    expect(root.querySelector('.platform-drawer-toolbar-actions button')?.textContent).toContain('复制');
  });
});
