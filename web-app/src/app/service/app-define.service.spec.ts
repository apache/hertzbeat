import { TestBed } from '@angular/core/testing';

import { AppDefineService } from './app-define.service';

describe('AppDefineService', () => {
  let service: AppDefineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppDefineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
