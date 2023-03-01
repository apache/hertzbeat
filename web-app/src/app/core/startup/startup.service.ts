import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ACLService } from '@delon/acl';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { ALAIN_I18N_TOKEN, Menu, MenuService, SettingsService, TitleService } from '@delon/theme';
import type { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzIconService } from 'ng-zorro-antd/icon';
import { Observable, zip, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ICONS } from '../../../style-icons';
import { ICONS_AUTO } from '../../../style-icons-auto';
import { I18NService } from '../i18n/i18n.service';
/**
 * Used for application startup
 * Generally used to get the basic data of the application, like: Menu Data, User Data, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class StartupService {
  constructor(
    iconSrv: NzIconService,
    private menuService: MenuService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService,
    private settingService: SettingsService,
    private aclService: ACLService,
    private titleService: TitleService,
    @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService,
    private httpClient: HttpClient,
    private router: Router
  ) {
    iconSrv.addIcon(...ICONS_AUTO, ...ICONS);
    iconSrv.fetchFromIconfont({
      scriptUrl: './assets/img/icon-gitee.js'
    });
  }

  public loadConfigResourceViaHttp(): Observable<void> {
    const defaultLang = this.i18n.defaultLang;
    return zip(
      this.i18n.loadLangData(defaultLang),
      this.httpClient.get('./assets/app-data.json'),
      this.httpClient.get('/apps/hierarchy')
    ).pipe(
      catchError((res: NzSafeAny) => {
        console.warn(`StartupService.load: Network request failed`, res);
        setTimeout(() => this.router.navigateByUrl(`/exception/500`));
        return [];
      }),
      map(([langData, appData, menuData]: [Record<string, string>, NzSafeAny, NzSafeAny]) => {
        // setting language data
        this.i18n.use(defaultLang, langData);

        // Application data
        // Application information: including site name, description, year
        this.settingService.setApp(appData.app);
        // https://ng-alain.com/theme/settings/zh
        this.settingService.setLayout('collapsed', true);
        // ACL: Set the permissions to full, https://ng-alain.com/acl/getting-started
        this.aclService.setFull(true);
        // Menu data, https://ng-alain.com/theme/menu
        this.menuService.add(appData.menu);
        menuData.data.forEach((item: { category: string; value: string }) => {
          let category = item.category;
          let app = item.value;
          let menu: Menu | null = this.menuService.getItem(category);
          if (menu != null) {
            menu.children?.push({
              text: app,
              link: `/monitors?app=${app}`,
              i18n: `monitor.app.${app}`
            });
          }
        });
        // 刷新菜单
        this.menuService.resume();
        // Can be set page suffix title, https://ng-alain.com/theme/title
        this.titleService.suffix = appData.app.name;
      })
    );
  }

  private viaMock(): Observable<void> {
    // const tokenData = this.tokenService.get();
    // if (!tokenData.token) {
    //   this.router.navigateByUrl(this.tokenService.login_url!);
    //   return;
    // }
    // mock
    const app: any = {
      name: `HertzBeat`,
      description: `面向开发者，易用友好的高性能监控云服务`
    };
    const user: any = {
      name: 'Admin',
      avatar: './assets/tmp/img/avatar.svg',
      email: 'tomsun28@outlook.com',
      token: '123456789'
    };
    // Application information: including site name, description, year
    this.settingService.setApp(app);
    // User information: including name, avatar, email address
    this.settingService.setUser(user);
    // ACL: Set the permissions to full, https://ng-alain.com/acl/getting-started
    this.aclService.setFull(true);
    // Menu data, https://ng-alain.com/theme/menu
    this.menuService.add([
      {
        text: 'Main',
        group: true,
        children: [
          {
            text: 'Dashboard',
            link: '/dashboard',
            icon: { type: 'icon', value: 'appstore' }
          }
        ]
      }
    ]);
    // Can be set page suffix title, https://ng-alain.com/theme/title
    this.titleService.suffix = app.name;

    return of();
  }

  load(): Observable<void> {
    // http
    return this.loadConfigResourceViaHttp();
    // mock: Don’t use it in a production environment. ViaMock is just to simulate some data to make the scaffolding work normally
    // mock：请勿在生产环境中这么使用，viaMock 单纯只是为了模拟一些数据使脚手架一开始能正常运行
    // return this.viaMockI18n();
  }
}
