import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorDataTableComponent } from './monitor-data-table.component';

describe('MonitorDataChartComponent', () => {
  let component: MonitorDataTableComponent;
  let fixture: ComponentFixture<MonitorDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorDataTableComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
