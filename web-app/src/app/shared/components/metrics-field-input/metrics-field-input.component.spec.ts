import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricsFieldInputComponent } from './metrics-field-input.component';

describe('MetricsFieldInputComponent', () => {
  let component: MetricsFieldInputComponent;
  let fixture: ComponentFixture<MetricsFieldInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricsFieldInputComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MetricsFieldInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
