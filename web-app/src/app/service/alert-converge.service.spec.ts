import { TestBed } from '@angular/core/testing';

import { AlertConvergeService } from './alert-converge.service';

describe('AlertConvergeService', () => {
  let service: AlertConvergeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertConvergeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
