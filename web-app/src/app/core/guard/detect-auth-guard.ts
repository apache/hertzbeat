import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable } from 'rxjs';

import { LocalStorageService } from '../../service/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DetectAuthGuard implements CanActivate {
  constructor(private localStorageSvc: LocalStorageService, private notifySvc: NzNotificationService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    let activate = this.localStorageSvc.hasAuthorizationToken();
    if (!activate) {
      setTimeout(() => {
        this.notifySvc.warning('请先登录!', '');
        this.router.navigateByUrl('/passport/login');
      });
    }
    return activate;
  }
}
