import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertSilenceComponent } from './alert-silence.component';

describe('AlertSilenceComponent', () => {
  let component: AlertSilenceComponent;
  let fixture: ComponentFixture<AlertSilenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertSilenceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertSilenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
