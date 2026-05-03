import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformChartCardComponent } from './platform-chart-card.component';

describe('PlatformChartCardComponent', () => {
  let fixture: ComponentFixture<PlatformChartCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformChartCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformChartCardComponent);
    fixture.componentInstance.title = '趋势';
    fixture.detectChanges();
  });

  it('should render title', () => {
    expect(fixture.nativeElement.textContent).toContain('趋势');
  });
});
