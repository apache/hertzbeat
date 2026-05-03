import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerAttributeListComponent } from './platform-drawer-attribute-list.component';

describe('PlatformDrawerAttributeListComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerAttributeListComponent>;
  let component: PlatformDrawerAttributeListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerAttributeListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerAttributeListComponent);
    component = fixture.componentInstance;
  });

  it('should render attribute items in preview mode by default', () => {
    component.items = [{ key: 'service.name', value: 'checkout' }];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.platform-drawer-attribute-item').length).toBe(1);
    expect(root.querySelector('.platform-drawer-attribute-list--detail')).toBeNull();
  });

  it('should expose the detail modifier when requested', () => {
    component.items = [{ key: 'http.method', value: 'GET' }];
    component.variant = 'detail';
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.platform-drawer-attribute-list')?.classList.contains('platform-drawer-attribute-list--detail')).toBeTrue();
  });
});
