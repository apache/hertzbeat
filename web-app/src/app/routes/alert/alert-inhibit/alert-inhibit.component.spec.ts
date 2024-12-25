import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertInhibitComponent } from './alert-inhibit.component';

describe('AlertInhibitComponent', () => {
  let component: AlertInhibitComponent;
  let fixture: ComponentFixture<AlertInhibitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertInhibitComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AlertInhibitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
