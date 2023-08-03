import { TestBed } from '@angular/core/testing';

import { CollectorService } from './collector.service';

describe('CollectorService', () => {
  let service: CollectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
