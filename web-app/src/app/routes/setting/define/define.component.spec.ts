import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefineComponent } from './define.component';

describe('DefineComponent', () => {
  let component: DefineComponent;
  let fixture: ComponentFixture<DefineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DefineComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DefineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
