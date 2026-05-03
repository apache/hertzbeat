import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerShellComponent } from './platform-drawer-shell.component';

@Component({
  standalone: true,
  imports: [PlatformDrawerShellComponent],
  template: `
    <app-platform-drawer-shell
      kicker="trace"
      title="详情"
      subtitle="副标题"
      [showSummary]="true"
      [showToolbar]="true"
      (closed)="closed = true"
    >
      <div drawerHeaderMeta class="meta">meta</div>
      <button drawerHeaderActions type="button" class="action">动作</button>
      <div drawerSummary class="summary">summary</div>
      <div drawerToolbar class="toolbar">toolbar</div>
      <div drawerContent class="content">content</div>
    </app-platform-drawer-shell>
  `
})
class HostComponent {
  closed = false;
}

describe('PlatformDrawerShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render all projected sections through the shared drawer shell', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-drawer-shell')).not.toBeNull();
    expect(root.querySelector('.platform-drawer-shell-kicker')?.textContent).toContain('trace');
    expect(root.querySelector('.platform-drawer-shell-title')?.textContent).toContain('详情');
    expect(root.querySelector('.platform-drawer-shell-subtitle')?.textContent).toContain('副标题');
    expect(root.querySelector('.meta')?.textContent).toContain('meta');
    expect(root.querySelector('.summary')?.textContent).toContain('summary');
    expect(root.querySelector('.toolbar')?.textContent).toContain('toolbar');
    expect(root.querySelector('.content')?.textContent).toContain('content');
  });

  it('should emit close from the shared drawer shell close button', () => {
    const host = fixture.componentInstance;
    const closeButton = fixture.nativeElement.querySelector('.platform-drawer-shell-close') as HTMLButtonElement;

    closeButton.click();
    fixture.detectChanges();

    expect(host.closed).toBeTrue();
  });
});
