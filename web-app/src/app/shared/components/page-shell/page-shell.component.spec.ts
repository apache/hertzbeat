import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageShellComponent } from './page-shell.component';

@Component({
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell kicker="Kicker" title="Title" subtitle="Subtitle">
      <div pageHeaderMeta class="host-header-meta">Meta</div>
      <button pageHeaderActions type="button" class="host-header-action">Action</button>
      <div pageHero class="host-hero">Hero</div>
      <div pageContent class="host-content">Content</div>
      <div pageAside class="host-aside">Aside</div>
      <div pageFooter class="host-footer">Footer</div>
    </app-page-shell>
  `
})
class HostComponent {}

@Component({
  standalone: true,
  imports: [PageShellComponent],
  template: `<app-page-shell title="Default shell"><div pageContent>Content</div></app-page-shell>`
})
class DefaultFooterHostComponent {}

@Component({
  standalone: true,
  imports: [PageShellComponent],
  template: `<app-page-shell title="Content footer shell" footerMode="content"><div pageContent>Content</div></app-page-shell>`
})
class ContentFooterHostComponent {}

@Component({
  standalone: true,
  imports: [PageShellComponent],
  template: `<app-page-shell title="Headerless shell" [hideHeader]="true"><div pageContent>Content</div></app-page-shell>`
})
class HeaderlessHostComponent {}

describe('PageShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render projected header meta, actions, hero, and content slots', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.host-header-meta')?.textContent).toContain('Meta');
    expect(root.querySelector('.host-header-action')?.textContent).toContain('Action');
    expect(root.querySelector('.host-hero')?.textContent).toContain('Hero');
    expect(root.querySelector('.host-content')?.textContent).toContain('Content');
    expect(root.querySelector('.host-footer')?.textContent).toContain('Footer');
  });

  it('should render the default platform footer when no footer slot is provided', async () => {
    const defaultFixture = TestBed.createComponent(DefaultFooterHostComponent);
    defaultFixture.detectChanges();

    const root = defaultFixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-platform-copyright-footer')).not.toBeNull();
  });

  it('should render the footer inside content flow when footerMode is content', () => {
    const contentFixture = TestBed.createComponent(ContentFooterHostComponent);
    contentFixture.detectChanges();

    const root = contentFixture.nativeElement as HTMLElement;
    const contentFooter = root.querySelector('.app-page-shell-content .app-page-shell-footer--content');
    const shellFooter = root.querySelector(':scope > .app-page-shell > .app-page-shell-footer:not(.app-page-shell-footer--content)');

    expect(contentFooter).not.toBeNull();
    expect(shellFooter).toBeNull();
  });

  it('should hide the standard shell header when hideHeader is true', () => {
    const headerlessFixture = TestBed.createComponent(HeaderlessHostComponent);
    headerlessFixture.detectChanges();

    const root = headerlessFixture.nativeElement as HTMLElement;
    expect(root.querySelector('.app-page-shell-header')).toBeNull();
  });
});
