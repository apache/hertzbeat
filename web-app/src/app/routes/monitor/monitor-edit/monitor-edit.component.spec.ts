import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorEditComponent } from './monitor-edit.component';

describe('MonitorModifyComponent', () => {
  let component: MonitorEditComponent;
  let fixture: ComponentFixture<MonitorEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorEditComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
