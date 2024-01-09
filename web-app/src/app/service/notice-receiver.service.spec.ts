import { TestBed } from '@angular/core/testing';

import { NoticeReceiverMailService } from './notice-receiver.service';

describe('NoticeReceiverService', () => {
  let service: NoticeReceiverMailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoticeReceiverMailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
