import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable } from 'rxjs';

import { LocalStorageService } from '../../service/local-storage.service';
import { hasAdminRole } from './admin-role';

@Injectable({
  providedIn: 'root'
})
export class DetectAuthGuard implements CanActivate {
  constructor(
    private localStorageSvc: LocalStorageService,
    private settingsService: SettingsService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const activate = this.localStorageSvc.hasAuthorizationToken() && hasAdminRole(this.settingsService.user?.role);
    if (!activate) {
      setTimeout(() => {
        this.notifySvc.warning(this.i18nSvc.fanyi('app.management.admin-only'), '');
        this.router.navigateByUrl('/passport/login');
      });
    }
    return activate;
  }
}
