import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertCenterComponent } from './alert-center.component';

describe('AlertCenterComponent', () => {
  let component: AlertCenterComponent;
  let fixture: ComponentFixture<AlertCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertCenterComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
