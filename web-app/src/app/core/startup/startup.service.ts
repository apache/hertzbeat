import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { ACLService } from '@delon/acl';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { ALAIN_I18N_TOKEN, Menu, MenuService, SettingsService, TitleService } from '@delon/theme';
import type { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzIconService } from 'ng-zorro-antd/icon';
import { Observable, zip } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ICONS } from '../../../style-icons';
import { ICONS_AUTO } from '../../../style-icons-auto';
import { MemoryStorageService } from '../../service/memory-storage.service';
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
    private router: Router,
    private storageService: MemoryStorageService
  ) {
    iconSrv.addIcon(...ICONS_AUTO, ...ICONS);
    iconSrv.fetchFromIconfont({
      scriptUrl: './assets/img/icon-gitee.js'
    });
  }

  public loadConfigResourceViaHttp(): Observable<void> {
    const defaultLang = this.i18n.defaultLang;
    const headers = new HttpHeaders({ 'Cache-Control': 'no-cache' });
    return zip(
      this.i18n.loadLangData(defaultLang),
      this.httpClient.get('./assets/app-data.json', { headers: headers }),
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
        // this.settingService.setLayout('collapsed', true);
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
        this.storageService.putData('hierarchy', menuData.data);
        // flush menu
        this.menuService.resume();
        // Can be set page suffix title, https://ng-alain.com/theme/title
        this.titleService.suffix = appData.app.name;
      })
    );
  }

  load(): Observable<void> {
    return this.loadConfigResourceViaHttp();
  }
}
