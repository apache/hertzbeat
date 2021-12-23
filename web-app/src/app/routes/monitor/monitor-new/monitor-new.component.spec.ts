import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorNewComponent } from './monitor-new.component';

describe('MonitorAddComponent', () => {
  let component: MonitorNewComponent;
  let fixture: ComponentFixture<MonitorNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorNewComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
