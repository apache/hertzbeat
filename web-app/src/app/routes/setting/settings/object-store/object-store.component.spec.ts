import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectStoreComponent } from './object-store.component';

describe('ObjectStoreComponent', () => {
  let component: ObjectStoreComponent;
  let fixture: ComponentFixture<ObjectStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ObjectStoreComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
