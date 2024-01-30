import { TestBed } from '@angular/core/testing';

import { StatusPageService } from './status-page.service';

describe('StatusPageService', () => {
  let service: StatusPageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusPageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
