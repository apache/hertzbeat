import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorDataChartComponent } from './monitor-data-chart.component';

describe('MonitorDataChartComponent', () => {
  let component: MonitorDataChartComponent;
  let fixture: ComponentFixture<MonitorDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorDataChartComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
