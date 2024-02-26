import { TestBed } from '@angular/core/testing';

import { StatusPagePublicService } from './status-page-public.service';

describe('StatusPagePublicService', () => {
  let service: StatusPagePublicService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusPagePublicService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
