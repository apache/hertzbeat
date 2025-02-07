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
import { ThemeService } from '../../service/theme.service';
import { I18NService } from '../i18n/i18n.service';

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
    private storageService: MemoryStorageService,
    private themeService: ThemeService
  ) {
    iconSrv.addIcon(...ICONS_AUTO, ...ICONS);
  }

  public loadConfigResourceViaHttp(): Observable<void> {
    const defaultLang = this.i18n.defaultLang;
    const headers = new HttpHeaders({ 'Cache-Control': 'no-cache' });
    return zip(
      this.i18n.loadLangData(defaultLang),
      this.httpClient.get('./assets/app-data.json', { headers: headers }),
      this.httpClient.get(`/apps/hierarchy?lang=${defaultLang}`)
    ).pipe(
      catchError((res: NzSafeAny) => {
        console.warn(`StartupService.load: Network request failed`, res);
        setTimeout(() => this.router.navigateByUrl(`/exception/500`));
        return [];
      }),
      map(([langData, appData, menuData]: [Record<string, string>, NzSafeAny, NzSafeAny]) => {
        // setting language data
        this.i18n.use(defaultLang, langData);
        // Application information: including site name, description, year
        this.settingService.setApp(appData.app);
        // this.settingService.setLayout('collapsed', true);
        this.aclService.setFull(true);
        this.menuService.add(appData.menu);
        menuData.data.forEach((item: { category: string; value: string; hide: boolean }) => {
          if (item.hide) {
            return;
          }
          let category = item.category;
          let app = item.value;
          let menu: Menu | null = this.menuService.getItem(category);
          if (menu != null) {
            menu.children?.push({
              text: app,
              link: `/monitors?app=${app}`,
              i18n: `monitor.app.${app}`
            });
          } else {
            if (app != 'prometheus' && app != 'push') {
              this.menuService.getItem('monitoring')?.children?.push({
                text: app,
                link: `/monitors?app=${app}`,
                i18n: `monitor.app.${app}`,
                icon: 'anticon-project'
              });
            }
          }
        });
        this.menuService.getItem('monitoring')?.children?.forEach(item => {
          if (item.key != null && (item.children == null || item.children.length == 0)) {
            item.hide = true;
          }
        });
        this.storageService.putData('hierarchy', menuData.data);
        this.menuService.resume();
        this.titleService.suffix = appData.app.name;
        this.themeService.changeTheme(null);
      })
    );
  }

  load(): Observable<void> {
    return this.loadConfigResourceViaHttp();
  }
}
