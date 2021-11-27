import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, TestBedStatic } from '@angular/core/testing';
import { DelonLocaleService, SettingsService } from '@delon/theme';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzI18nService } from 'ng-zorro-antd/i18n';
import { of } from 'rxjs';

import { I18NService } from './i18n.service';

describe('Service: I18n', () => {
  let injector: TestBedStatic;
  let srv: I18NService;
  const MockSettingsService: NzSafeAny = {
    layout: {
      lang: null
    }
  };
  const MockNzI18nService = {
    setLocale: () => {},
    setDateLocale: () => {}
  };
  const MockDelonLocaleService = {
    setLocale: () => {}
  };
  const MockTranslateService = {
    getBrowserLang: jasmine.createSpy('getBrowserLang'),
    addLangs: () => {},
    setLocale: () => {},
    getDefaultLang: () => '',
    use: (lang: string) => of(lang),
    instant: jasmine.createSpy('instant')
  };

  function genModule(): void {
    injector = TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        I18NService,
        { provide: SettingsService, useValue: MockSettingsService },
        { provide: NzI18nService, useValue: MockNzI18nService },
        { provide: DelonLocaleService, useValue: MockDelonLocaleService }
      ]
    });
    srv = TestBed.inject(I18NService);
  }

  it('should working', () => {
    spyOnProperty(navigator, 'languages').and.returnValue(['zh-CN']);
    genModule();
    expect(srv).toBeTruthy();
    expect(srv.defaultLang).toBe('zh-CN');
    srv.fanyi('a');
    srv.fanyi('a', {});
  });

  it('should be used layout as default language', () => {
    MockSettingsService.layout.lang = 'en-US';
    const navSpy = spyOnProperty(navigator, 'languages');
    genModule();
    expect(navSpy).not.toHaveBeenCalled();
    expect(srv.defaultLang).toBe('en-US');
    MockSettingsService.layout.lang = null;
  });

  it('should be used browser as default language', () => {
    spyOnProperty(navigator, 'languages').and.returnValue(['zh-TW']);
    genModule();
    expect(srv.defaultLang).toBe('zh-TW');
  });

  it('should be use default language when the browser language is not in the list', () => {
    spyOnProperty(navigator, 'languages').and.returnValue(['es-419']);
    genModule();
    expect(srv.defaultLang).toBe('zh-CN');
  });

  it('should be trigger notify when changed language', () => {
    genModule();
    srv.use('en-US', {});
    srv.change.subscribe(lang => {
      expect(lang).toBe('en-US');
    });
  });
});
