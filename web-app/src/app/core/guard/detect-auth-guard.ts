import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {Observable} from "rxjs";
import {Injectable} from "@angular/core";
import {LocalStorageService} from "../../service/local-storage.service";
import {NzNotificationService} from "ng-zorro-antd/notification";

@Injectable({
  providedIn: 'root'
})
export class DetectAuthGuard implements CanActivate {

  constructor(private localStorageSvc : LocalStorageService,
              private notifySvc: NzNotificationService,
              private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot):
    Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    let activate = this.localStorageSvc.hasAuthorizationToken();
    if (!activate) {
      setTimeout(() => {
        this.notifySvc.warning('请先登陆!','')
        this.router.navigateByUrl('/passport/login');
      });
    }
    return activate;
  }
}
