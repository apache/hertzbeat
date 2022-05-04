import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService, User } from '@delon/theme';

import { LocalStorageService } from '../../../service/local-storage.service';

@Component({
  selector: 'header-user',
  template: `
    <div class="alain-default__nav-item d-flex align-items-center px-sm" (click)="logout()">
      <i nz-icon nzType="logout" class="mr-sm"></i>
      {{ 'menu.account.logout' | i18n }}
    </div>
    <!--
    <div class="alain-default__nav-item d-flex align-items-center px-sm" nz-dropdown nzPlacement="bottomRight" [nzDropdownMenu]="userMenu">
      <nz-avatar [nzSrc]="user.avatar" nzSize="small" class="mr-sm"></nz-avatar>
      {{ user.name }}
    </div>
    <nz-dropdown-menu #userMenu="nzDropdownMenu">
      <div nz-menu class="width-sm">
        <li nz-menu-divider></li>
        <div nz-menu-item (click)="logout()">
          <i nz-icon nzType="logout" class="mr-sm"></i>
          {{ 'menu.account.logout' | i18n }}
        </div>
      </div>
    </nz-dropdown-menu>
-->
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderUserComponent {
  get user(): User {
    return this.settings.user;
  }

  constructor(private settings: SettingsService, private router: Router, private localStorageSvc: LocalStorageService) {}

  logout(): void {
    this.localStorageSvc.clear();
    this.router.navigateByUrl('/passport/login');
  }
}
