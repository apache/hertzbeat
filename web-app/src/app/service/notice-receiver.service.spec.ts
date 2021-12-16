import { TestBed } from '@angular/core/testing';

import { NoticeReceiverService } from './notice-receiver.service';

describe('NoticeReceiverService', () => {
  let service: NoticeReceiverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoticeReceiverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
