import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelSelectorComponent } from './label-selector.component';

describe('LabelSelectorComponent', () => {
  let component: LabelSelectorComponent;
  let fixture: ComponentFixture<LabelSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LabelSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
