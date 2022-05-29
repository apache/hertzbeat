import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyValueInputComponent } from './key-value-input.component';

describe('KeyValueInputComponent', () => {
  let component: KeyValueInputComponent;
  let fixture: ComponentFixture<KeyValueInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KeyValueInputComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyValueInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
