import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSupportLinkItem, PlatformSupportLinkListComponent } from './platform-support-link-list.component';

describe('PlatformSupportLinkListComponent', () => {
  let fixture: ComponentFixture<PlatformSupportLinkListComponent>;
  let component: PlatformSupportLinkListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformSupportLinkListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformSupportLinkListComponent);
    component = fixture.componentInstance;
  });

  it('should render support links with descriptions and emit the selected key', () => {
    const emitted: string[] = [];
    component.items = [
      {
        key: 'open-logs',
        label: '查看相关日志',
        description: '继续沿当前链路核对关联日志。'
      },
      {
        key: 'open-code',
        label: '打开代码定位',
        disabled: true
      }
    ] satisfies PlatformSupportLinkItem[];
    component.itemSelected.subscribe((key: string) => emitted.push(key));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.platform-support-link-list-item');
    expect(buttons.length).toBe(2);
    expect(root.textContent).toContain('查看相关日志');
    expect(root.textContent).toContain('继续沿当前链路核对关联日志。');

    buttons[0].click();
    buttons[1].click();

    expect(emitted).toEqual(['open-logs']);
  });
});
