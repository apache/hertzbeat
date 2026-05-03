import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerPillRowComponent } from './platform-drawer-pill-row.component';

describe('PlatformDrawerPillRowComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerPillRowComponent>;
  let component: PlatformDrawerPillRowComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerPillRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerPillRowComponent);
    component = fixture.componentInstance;
  });

  it('should render pills with status tones', () => {
    component.items = [
      { text: 'Error', tone: 'error' },
      { text: 'Span ID · span-1', tone: 'default' }
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.platform-drawer-pill').length).toBe(2);
    expect(root.querySelector('.platform-drawer-pill.error')?.textContent).toContain('Error');
  });

  it('should emit selected action pill keys and mark active state', () => {
    const selectedKeys: string[] = [];
    component.items = [
      { text: 'HTTP', actionKey: 'http', active: true },
      { text: 'gRPC', actionKey: 'grpc' }
    ];
    component.itemSelected.subscribe(key => selectedKeys.push(key));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button.platform-drawer-pill');

    expect(buttons.length).toBe(2);
    expect(buttons[0].classList).toContain('active');

    buttons[1].click();

    expect(selectedKeys).toEqual(['grpc']);
  });
});
