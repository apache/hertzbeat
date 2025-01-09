import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertIntegrationComponent } from './alert-integration.component';

describe('AlertIntegrationComponent', () => {
  let component: AlertIntegrationComponent;
  let fixture: ComponentFixture<AlertIntegrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertIntegrationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AlertIntegrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
