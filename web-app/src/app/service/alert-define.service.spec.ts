import { TestBed } from '@angular/core/testing';

import { AlertDefineService } from './alert-define.service';

describe('AlertDefineService', () => {
  let service: AlertDefineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertDefineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
