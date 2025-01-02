import { TestBed } from '@angular/core/testing';

import { AlertInhibitService } from './alert-inhibit.service';

describe('AlertInhibitService', () => {
  let service: AlertInhibitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertInhibitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
