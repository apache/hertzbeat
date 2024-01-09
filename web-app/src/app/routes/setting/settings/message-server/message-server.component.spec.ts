import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageServerComponent } from './message-server.component';

describe('MessageServerComponent', () => {
  let component: MessageServerComponent;
  let fixture: ComponentFixture<MessageServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageServerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MessageServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
