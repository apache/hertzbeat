import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformColumnHeaderRowComponent } from './platform-column-header-row.component';

describe('PlatformColumnHeaderRowComponent', () => {
  let fixture: ComponentFixture<PlatformColumnHeaderRowComponent>;
  let component: PlatformColumnHeaderRowComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformColumnHeaderRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformColumnHeaderRowComponent);
    component = fixture.componentInstance;
  });

  it('should render each header cell in order', () => {
    component.items = ['链路', '服务', '耗时'];
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.platform-column-header-cell') as NodeListOf<HTMLElement>;
    const cells = Array.from(items).map(item => item.textContent?.trim());

    expect(cells).toEqual(['链路', '服务', '耗时']);
  });
});
