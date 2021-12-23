import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertNoticeComponent } from './alert-notice.component';

describe('AlertNoticeComponent', () => {
  let component: AlertNoticeComponent;
  let fixture: ComponentFixture<AlertNoticeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertNoticeComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertNoticeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
