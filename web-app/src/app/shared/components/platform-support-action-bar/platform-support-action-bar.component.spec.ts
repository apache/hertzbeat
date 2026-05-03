import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSupportActionBarComponent, PlatformSupportActionItem } from './platform-support-action-bar.component';

describe('PlatformSupportActionBarComponent', () => {
  let fixture: ComponentFixture<PlatformSupportActionBarComponent>;
  let component: PlatformSupportActionBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformSupportActionBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformSupportActionBarComponent);
    component = fixture.componentInstance;
  });

  it('should render support actions and emit the selected key', () => {
    const emitted: string[] = [];
    component.items = [
      { key: 'return-entity', label: '回到实体详情' },
      { key: 'open-monitors', label: '查看相关监控', disabled: true }
    ] satisfies PlatformSupportActionItem[];
    component.itemSelected.subscribe((key: string) => emitted.push(key));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.platform-support-action-bar-button');

    expect(buttons.length).toBe(2);
    buttons[0].click();
    buttons[1].click();

    expect(emitted).toEqual(['return-entity']);
  });
});
