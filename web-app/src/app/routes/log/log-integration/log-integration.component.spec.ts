import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogIntegrationComponent } from './log-integration.component';

describe('LogIntegrationComponent', () => {
  let component: LogIntegrationComponent;
  let fixture: ComponentFixture<LogIntegrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogIntegrationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LogIntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
