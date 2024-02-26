import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusPublicComponent } from './status-public.component';

describe('StatusPublicComponent', () => {
  let component: StatusPublicComponent;
  let fixture: ComponentFixture<StatusPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusPublicComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusPublicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
