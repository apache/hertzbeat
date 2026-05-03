import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PlatformDrawerCalloutCardComponent } from './platform-drawer-callout-card.component';

@Component({
  standalone: true,
  imports: [PlatformDrawerCalloutCardComponent],
  template: `
    <app-platform-drawer-callout-card
      title="相关对象"
      subtitle="entity"
      body="聚焦这个对象继续调查"
      detail="trace-1"
      [contextTags]="['checkout', 'prod']"
    >
      <button drawerCalloutActions type="button">查看详情</button>
      <div class="projected">附加内容</div>
    </app-platform-drawer-callout-card>
  `
})
class TestHostComponent {}

describe('PlatformDrawerCalloutCardComponent', () => {
  it('should render title, meta, projected actions, tags and body content', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents().then(() => TestBed.createComponent(TestHostComponent));

    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.platform-drawer-callout-title')?.textContent).toContain('相关对象');
    expect(root.querySelector('.platform-drawer-callout-subtitle')?.textContent).toContain('entity');
    expect(root.querySelector('.platform-drawer-callout-body')?.textContent).toContain('聚焦这个对象继续调查');
    expect(root.querySelector('.platform-drawer-callout-detail')?.textContent).toContain('trace-1');
    expect(root.querySelector('[drawerCalloutActions]')?.textContent).toContain('查看详情');
    expect(root.querySelector('.projected')?.textContent).toContain('附加内容');
    expect(Array.from(root.querySelectorAll('.platform-drawer-callout-tag')).map(node => node.textContent?.trim())).toEqual([
      'checkout',
      'prod'
    ]);
  });
});
