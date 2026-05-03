import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerSectionListComponent } from './platform-drawer-section-list.component';

describe('PlatformDrawerSectionListComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerSectionListComponent>;
  let component: PlatformDrawerSectionListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerSectionListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerSectionListComponent);
    component = fixture.componentInstance;
  });

  it('should render section items with attribute previews', () => {
    component.items = [
      {
        title: 'db.query',
        meta: '时间 · 15 ms',
        secondaryMeta: ['丢弃属性 · 2'],
        attributeItems: [{ key: 'db.statement', value: 'SELECT 1' }]
      }
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.platform-drawer-section-list-item').length).toBe(1);
    expect(root.textContent).toContain('db.query');
    expect(root.textContent).toContain('SELECT 1');
  });

  it('should render empty copy when items are missing', () => {
    component.items = [];
    component.emptyCopy = '当前没有数据';
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-drawer-section-list-empty')?.textContent).toContain('当前没有数据');
  });

  it('should emit action selection when an item action is clicked', () => {
    const selectedKeys: string[] = [];
    component.items = [
      {
        title: 'checkout-api',
        meta: 'service / production',
        actionLabel: '查看实体',
        actionKey: 'entity-42'
      }
    ];
    component.itemActionSelected.subscribe((key: string) => selectedKeys.push(key));
    fixture.detectChanges();

    const actionButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.platform-drawer-section-list-action'
    ) as HTMLButtonElement | null;

    expect(actionButton).not.toBeNull();
    actionButton?.click();

    expect(selectedKeys).toEqual(['entity-42']);
  });
});
