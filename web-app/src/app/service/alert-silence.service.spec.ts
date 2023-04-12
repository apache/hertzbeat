import { TestBed } from '@angular/core/testing';

import { AlertSilenceService } from './alert-silence.service';

describe('AlertSilenceService', () => {
  let service: AlertSilenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertSilenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
