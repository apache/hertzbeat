import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelsInputComponent } from './labels-input.component';

describe('LabelsInputComponent', () => {
  let component: LabelsInputComponent;
  let fixture: ComponentFixture<LabelsInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelsInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LabelsInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
