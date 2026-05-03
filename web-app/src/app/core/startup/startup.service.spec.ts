import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ACLService } from '@delon/acl';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { ALAIN_I18N_TOKEN, MenuService, SettingsService, TitleService } from '@delon/theme';
import { NzIconService } from 'ng-zorro-antd/icon';
import { of } from 'rxjs';

import { MemoryStorageService } from '../../service/memory-storage.service';
import { ThemeService } from '../../service/theme.service';
import { GeneralConfigService } from '../../service/general-config.service';
import { I18NService } from '../i18n/i18n.service';
import { StartupService } from './startup.service';

describe('StartupService', () => {
  let service: StartupService;
  let i18nService: jasmine.SpyObj<I18NService>;
  let httpClient: jasmine.SpyObj<any>;
  let configService: jasmine.SpyObj<GeneralConfigService>;
  let menuService: jasmine.SpyObj<MenuService>;

  const appDataFixture = {
    app: { name: 'HertzBeat' },
    menu: [
      {
        text: 'Guide',
        i18n: 'menu.main',
        children: [{ text: 'Dashboard', i18n: 'menu.dashboard', link: '/dashboard' }]
      },
      {
        text: 'Alarm',
        i18n: 'menu.alert',
        children: [{ text: 'Center', i18n: 'menu.alert.center', link: '/alert/center' }]
      }
    ]
  };

  beforeEach(() => {
    i18nService = jasmine.createSpyObj<I18NService>('I18NService', ['loadLangData', 'use'], {
      defaultLang: 'en-US'
    });
    httpClient = jasmine.createSpyObj('HttpClient', ['get']);
    configService = jasmine.createSpyObj<GeneralConfigService>('GeneralConfigService', ['getGeneralConfig']);
    menuService = jasmine.createSpyObj<MenuService>('MenuService', ['add', 'getItem', 'resume']);
    menuService.getItem.and.returnValue({ children: [] } as any);

    configService.getGeneralConfig.and.returnValue(
      of({
        code: 0,
        msg: 'ok',
        data: {
          locale: 'zh_CN'
        }
      })
    );
    i18nService.loadLangData.and.returnValue(of({}));
    httpClient.get.and.callFake((url: string) => {
      if (url === './assets/app-data.json') {
        return of(appDataFixture);
      }
      if (url === '/apps/hierarchy?lang=zh-CN') {
        return of({ data: [] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StartupService,
        { provide: NzIconService, useValue: { addIcon: () => void 0 } },
        { provide: MenuService, useValue: menuService },
        { provide: I18NService, useValue: i18nService },
        { provide: ALAIN_I18N_TOKEN, useValue: i18nService },
        { provide: SettingsService, useValue: { setApp: () => void 0, setLayout: () => void 0 } },
        { provide: ACLService, useValue: { setFull: () => void 0 } },
        { provide: TitleService, useValue: { suffix: '' } },
        { provide: DA_SERVICE_TOKEN, useValue: {} as ITokenService },
        { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
        { provide: MemoryStorageService, useValue: { putData: () => void 0 } },
        { provide: ThemeService, useValue: { changeTheme: () => void 0 } },
        { provide: GeneralConfigService, useValue: configService },
        { provide: HttpClient, useValue: httpClient }
      ]
    });

    service = TestBed.inject(StartupService);
    (service as any).httpClient = httpClient;
  });

  it('should use backend system locale during startup when it is available', done => {
    service.loadConfigResourceViaHttp().subscribe({
      next: () => {
        expect(configService.getGeneralConfig).toHaveBeenCalledWith('system');
        expect(i18nService.loadLangData).toHaveBeenCalledWith('zh-CN');
        expect(httpClient.get).toHaveBeenCalledWith('/apps/hierarchy?lang=zh-CN');
        expect(i18nService.use).toHaveBeenCalledWith('zh-CN', {});
        done();
      },
      error: done.fail
    });
  });

  it('should normalize aliased menu links to the canonical routes used by sidebar selection', done => {
    service.loadConfigResourceViaHttp().subscribe({
      next: () => {
        expect(menuService.add).toHaveBeenCalled();
        const addedMenu = menuService.add.calls.mostRecent().args[0] as any[];
        const dashboardEntry = addedMenu[0].children[0];
        const alertCenterEntry = addedMenu[1].children[0];

        expect(dashboardEntry.link).toBe('/overview');
        expect(alertCenterEntry.link).toBe('/alert');
        done();
      },
      error: done.fail
    });
  });
});
