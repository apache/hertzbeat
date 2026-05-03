import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PlatformDrawerSectionComponent } from './platform-drawer-section.component';

@Component({
  standalone: true,
  imports: [PlatformDrawerSectionComponent],
  template: `
    <app-platform-drawer-section title="相关事件">
      <button drawerSectionActions type="button">查看更多</button>
      <div class="projected">内容区</div>
    </app-platform-drawer-section>
  `
})
class TestHostComponent {}

describe('PlatformDrawerSectionComponent', () => {
  it('should render title, actions and projected body', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents().then(() => TestBed.createComponent(TestHostComponent));

    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-drawer-section-title')?.textContent).toContain('相关事件');
    expect(root.querySelector('[drawerSectionActions]')?.textContent).toContain('查看更多');
    expect(root.querySelector('.projected')?.textContent).toContain('内容区');
  });
});
