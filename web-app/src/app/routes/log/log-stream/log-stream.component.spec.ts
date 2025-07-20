import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogStreamComponent } from './log-stream.component';

describe('LogStreamComponent', () => {
  let component: LogStreamComponent;
  let fixture: ComponentFixture<LogStreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogStreamComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LogStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
