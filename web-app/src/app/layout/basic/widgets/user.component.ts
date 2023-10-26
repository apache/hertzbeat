import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService, User } from '@delon/theme';

import { LocalStorageService } from '../../../service/local-storage.service';
import { CONSTANTS } from '../../../shared/constants';

@Component({
  selector: 'header-user',
  template: `
    <div class="alain-default__nav-item d-flex align-items-center px-sm" nz-dropdown nzPlacement="bottomRight" [nzDropdownMenu]="userMenu">
      <nz-avatar [nzSrc]="user.avatar" nzSize="small" class="mr-sm"></nz-avatar>
      {{ user.name }}
    </div>
    <nz-dropdown-menu #userMenu="nzDropdownMenu">
      <div nz-menu class="width-sm">
        <div nz-menu-item routerLink="/setting/settings/config">
          <i nz-icon nzType="tool" class="mr-sm"></i>
          {{ 'menu.extras.setting' | i18n }}
        </div>
        <div nz-menu-item (click)="logout()">
          <i nz-icon nzType="logout" class="mr-sm"></i>
          {{ 'menu.account.logout' | i18n }}
        </div>
        <div nz-menu-item (click)="showAboutModal()">
          <i nz-icon nzType="environment" class="mr-sm"></i>
          {{ 'menu.extras.about' | i18n }}
        </div>
      </div>
    </nz-dropdown-menu>
    <nz-modal
      [(nzVisible)]="isAboutModalVisible"
      [nzTitle]=""
      [nzFooter]="null"
      (nzOnCancel)="disAboutModal()"
      nzClosable="false"
      nzWidth="48%"
    >
      <div *nzModalContent class="-inner-content">
        <div style="text-align: center">
          <img style="height: 33px" src="./assets/brand.svg" alt="" />
        </div>
        <div style="margin-top: 10px; font-weight: bolder; font-size: small;">
          {{ 'about.title' | i18n }}
        </div>
        <div style="margin-top: 10px; font-weight: normal; font-size: small;">
          <nz-badge nzStatus="processing" [nzText]="'about.point.1' | i18n"></nz-badge>
          <br />
          <nz-badge nzStatus="processing" [nzText]="'about.point.2' | i18n"></nz-badge>
          <br />
          <nz-badge nzStatus="processing" [nzText]="'about.point.3' | i18n"></nz-badge>
          <br />
          <nz-badge nzStatus="processing" [nzText]="'about.point.4' | i18n"></nz-badge>
          <br />
          <nz-badge nzStatus="processing" [nzText]="'about.point.5' | i18n"></nz-badge>
          <br />
        </div>
        <div style="margin-top: 10px; font-weight: normal; font-size: small;">
          {{ 'about.help' | i18n }}
        </div>
        <div style="margin-top: 10px; font-weight: bolder; font-size: medium;">
          <a [href]="'https://github.com/dromara/hertzbeat/releases/tag/' + version" target="_blank"> HertzBeat {{ version }} </a>
        </div>
        <div style="margin-top: 10px; font-weight: normal; font-size: small;">
          Copyright &copy; 2021-{{ currentYear }}
          <nz-divider nzType="vertical"></nz-divider>
          <a href="https://hertzbeat.com" target="_blank">hertzbeat.com</a>
          <nz-divider nzType="vertical"></nz-divider>
          <a href="https://tancloud.cn" target="_blank">tancloud.cn</a>
        </div>
        <nz-divider></nz-divider>
        <div style="margin-top: 10px; font-weight: bolder">
          <span nz-icon nzType="github"></span>
          <a href="//github.com/dromara/hertzbeat" target="_blank"> {{ 'about.github' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzIconfont="icon-gitee"></span>
          <a href="//gitee.com/dromara/hertzbeat" target="_blank"> {{ 'about.gitee' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzType="bug"></span>
          <a href="//github.com/dromara/hertzbeat/issues" target="_blank"> {{ 'about.issue' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzType="fork"></span>
          <a href="//github.com/dromara/hertzbeat/pulls" target="_blank"> {{ 'about.pr' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzType="message"></span>
          <a href="//discord.com/invite/Fb6M73htGr" target="_blank"> {{ 'about.discuss' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzType="read"></span>
          <a href="https://hertzbeat.com/docs/" target="_blank"> {{ 'about.doc' | i18n }} </a>
          <nz-divider nzType="vertical"></nz-divider>
          <span nz-icon nzType="cloud-download"></span>
          <a href="https://hertzbeat.com/docs/start/upgrade" target="_blank"> {{ 'about.upgrade' | i18n }} </a>
          <a style="float: right" href="//github.com/dromara/hertzbeat" target="_blank"> {{ 'about.star' | i18n }} </a>
          <span style="float: right" nz-icon nzType="star" nzTheme="twotone"></span>
          <nz-divider style="float: right" nzType="vertical"></nz-divider>
        </div>
      </div>
    </nz-modal>
  `,
  changeDetection: ChangeDetectionStrategy.Default
})
export class HeaderUserComponent {
  isAboutModalVisible = false;
  version = CONSTANTS.VERSION;
  currentYear = new Date().getFullYear();
  get user(): User {
    return this.settings.user;
  }

  constructor(private settings: SettingsService, private router: Router, private localStorageSvc: LocalStorageService) {
    // @ts-ignore
    if (router.getCurrentNavigation()?.previousNavigation?.finalUrl.toString() === '/passport/login') {
      this.showAndCloseAboutModal();
    }
  }

  logout(): void {
    this.localStorageSvc.clear();
    this.router.navigateByUrl('/passport/login');
  }

  showAboutModal() {
    this.isAboutModalVisible = true;
  }

  disAboutModal() {
    this.isAboutModalVisible = false;
  }

  showAndCloseAboutModal() {
    this.isAboutModalVisible = true;
    setTimeout(() => (this.isAboutModalVisible = false), 20000);
  }
}
