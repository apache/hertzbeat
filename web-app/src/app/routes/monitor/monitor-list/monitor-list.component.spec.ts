import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorListComponent } from './monitor-list.component';

describe('MonitorListComponent', () => {
  let component: MonitorListComponent;
  let fixture: ComponentFixture<MonitorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorListComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
