import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertConvergeComponent } from './alert-converge.component';

describe('AlertConvergeComponent', () => {
  let component: AlertConvergeComponent;
  let fixture: ComponentFixture<AlertConvergeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertConvergeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertConvergeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
