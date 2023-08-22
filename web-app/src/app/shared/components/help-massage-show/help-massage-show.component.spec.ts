import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpMassageShowComponent } from './help-massage-show.component';

describe('HelpMassageShowComponent', () => {
  let component: HelpMassageShowComponent;
  let fixture: ComponentFixture<HelpMassageShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HelpMassageShowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HelpMassageShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
