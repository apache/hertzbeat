import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertSettingComponent } from './alert-setting.component';

describe('AlertSettingComponent', () => {
  let component: AlertSettingComponent;
  let fixture: ComponentFixture<AlertSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertSettingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
