import { I18NService } from '@core';

import { I18nElsePipe } from './i18n-else.pipe';
describe('I18nValuePipe', () => {
  let srv: I18NService;
  it('create an instance', () => {
    const pipe = new I18nElsePipe(srv);
    expect(pipe).toBeTruthy();
  });
});
