import { TestBed } from '@angular/core/testing';

import { NoticeTemplateService } from './notice-template.service';

describe('NoticeTemplateService', () => {
  let service: NoticeTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoticeTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
