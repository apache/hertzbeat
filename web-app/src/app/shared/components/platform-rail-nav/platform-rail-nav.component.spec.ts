import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformRailNavComponent } from './platform-rail-nav.component';

describe('PlatformRailNavComponent', () => {
  let fixture: ComponentFixture<PlatformRailNavComponent>;
  let component: PlatformRailNavComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, PlatformRailNavComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformRailNavComponent);
    component = fixture.componentInstance;
    component.groups = [
      {
        key: 'software',
        title: '软件',
        items: [
          { key: 'all', label: '全部实体', icon: 'appstore', count: 2, active: true },
          { key: 'k8s', label: 'K8s 负载', tooltip: 'K8s 工作负载', icon: 'appstore', count: 0 }
        ]
      },
      {
        key: 'static',
        title: '摘要',
        items: [{ key: 'ready', label: '可直接导入', icon: 'file-text', count: 1, static: true }]
      }
    ];
    fixture.detectChanges();
  });

  it('should render groups and preserve tooltip/count layout for rail items', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.catalog-rail-group').length).toBe(2);
    expect(root.textContent).toContain('K8s 负载');
    expect(root.querySelector('.catalog-rail-item[title="K8s 工作负载"]')).not.toBeNull();
    expect(root.querySelector('.catalog-rail-item.active .catalog-rail-item-count')?.textContent?.trim()).toBe('2');
  });

  it('should emit interactive items only', () => {
    const emittedKeys: string[] = [];
    component.itemSelected.subscribe(item => emittedKeys.push(item.key));

    const root = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(root.querySelectorAll('.catalog-rail-item'));
    (buttons[0] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();

    expect(emittedKeys).toEqual(['all']);
  });
});
