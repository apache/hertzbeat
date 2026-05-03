import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformContextChipBarComponent } from './platform-context-chip-bar.component';

describe('PlatformContextChipBarComponent', () => {
  let fixture: ComponentFixture<PlatformContextChipBarComponent>;
  let component: PlatformContextChipBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformContextChipBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformContextChipBarComponent);
    component = fixture.componentInstance;
  });

  it('should render inline context chips', () => {
    component.items = [
      { label: '实体', value: 'Checkout Service' },
      { label: '服务', value: 'checkout' }
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-context-chip-bar--inline')).not.toBeNull();
    expect(root.textContent).toContain('Checkout Service');
    expect(root.textContent).toContain('checkout');
  });

  it('should render header chips in grid mode', () => {
    component.variant = 'header';
    component.items = [
      { label: '应用', value: 'Website' },
      { label: '实例', value: 'example.com:80' },
      { label: 'ID', value: '1' }
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-context-chip-bar--header')).not.toBeNull();
    expect(root.querySelectorAll('.platform-context-chip').length).toBe(3);
  });
});
