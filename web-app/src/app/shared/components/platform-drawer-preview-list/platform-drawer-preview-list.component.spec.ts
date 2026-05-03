import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformDrawerPreviewListComponent } from './platform-drawer-preview-list.component';

describe('PlatformDrawerPreviewListComponent', () => {
  let fixture: ComponentFixture<PlatformDrawerPreviewListComponent>;
  let component: PlatformDrawerPreviewListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformDrawerPreviewListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformDrawerPreviewListComponent);
    component = fixture.componentInstance;
  });

  it('should render preview items as stacked label/value rows', () => {
    component.items = [
      { label: 'Trace', value: 'trace-1' },
      { label: 'Span', value: 'span-1' }
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.platform-drawer-preview-item').length).toBe(2);
    expect(root.textContent).toContain('Trace');
    expect(root.textContent).toContain('span-1');
  });
});
