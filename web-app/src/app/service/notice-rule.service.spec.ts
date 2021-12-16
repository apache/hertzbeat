import { TestBed } from '@angular/core/testing';

import { NoticeRuleService } from './notice-rule.service';

describe('NoticeRuleService', () => {
  let service: NoticeRuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoticeRuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
