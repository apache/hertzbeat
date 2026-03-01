import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService, User } from '@delon/theme';
import { LayoutDefaultOptions } from '@delon/theme/layout-default';
import { environment } from '@env/environment';
import { Subject } from 'rxjs';

import { CONSTANTS } from '../../shared/constants';
import { AiChatModalService } from '../../shared/services/ai-chat-modal.service';

@Component({
  selector: 'layout-basic',
  template: `
    <layout-default [options]="options" [nav]="navTpl" [content]="contentTpl" [customError]="null">
      <layout-default-header-item direction="left">
        <a layout-default-header-item-trigger href="//github.com/apache/hertzbeat" target="_blank">
          <i nz-icon nzType="github"></i>
        </a>
      </layout-default-header-item>

      <layout-default-header-item direction="middle">
        <header-ai-chat class="alain-default__ai-chat"></header-ai-chat>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <header-notify></header-notify>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <a layout-default-header-item-trigger routerLink="/passport/lock">
          <i nz-icon nzType="lock"></i>
        </a>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <div layout-default-header-item-trigger nz-dropdown [nzDropdownMenu]="settingsMenu" nzTrigger="click" nzPlacement="bottomRight">
          <i nz-icon nzType="setting"></i>
        </div>
        <nz-dropdown-menu #settingsMenu="nzDropdownMenu">
          <div nz-menu style="width: 200px;">
            <div nz-menu-item>
              <header-fullscreen></header-fullscreen>
            </div>
            <div nz-menu-item routerLink="/setting/labels">
              <i nz-icon nzType="tag" class="mr-sm"></i>
              <span style="margin-left: 4px">{{ 'menu.advanced.labels' | i18n }}</span>
            </div>
            <div nz-menu-item>
              <header-i18n></header-i18n>
            </div>
          </div>
        </nz-dropdown-menu>
      </layout-default-header-item>
      <layout-default-header-item direction="right">
        <header-user></header-user>
      </layout-default-header-item>
      <ng-template #navTpl>
        <layout-default-nav class="d-block py-lg" openStrictly="true"></layout-default-nav>
      </ng-template>
      <ng-template #contentTpl>
        <router-outlet></router-outlet>
      </ng-template>
    </layout-default>
    <global-footer>
      <div style="margin-top: 30px">
        Apache HertzBeat™ {{ version }}<br />
        Copyright &copy; {{ currentYear }}
        <a href="https://hertzbeat.apache.org" target="_blank">Apache HertzBeat™</a>
        <br />
        Licensed under the Apache License, Version 2.0
      </div>
    </global-footer>
    <setting-drawer *ngIf="showSettingDrawer" appSettingDrawerI18n></setting-drawer>

    <!-- AI Chat Button -->
    <div class="ai-chat-button-container">
      <div class="ai-chat-button" (click)="openChatModal()">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="white"
          style="min-width:36px; min-height:36px;"
        >
          <path
            d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"
          />
        </svg>
      </div>
    </div>
  `,
  styleUrls: ['./basic.component.less']
})
export class LayoutBasicComponent implements OnDestroy {
  options: LayoutDefaultOptions = {
    logoExpanded: `./assets/brand_white.svg`,
    logoCollapsed: `./assets/logo.svg`
  };
  avatar: string = `./assets/img/avatar.svg`;
  searchToggleStatus = false;
  aiChatToggleStatus = false;
  showSettingDrawer = !environment.production;
  version = CONSTANTS.VERSION;
  currentYear = new Date().getFullYear();

  get user(): User {
    return this.settings.user;
  }

  get role(): string {
    let userTmp = this.settings.user;
    if (userTmp == undefined || userTmp.role == undefined) {
      return this.i18nSvc.fanyi('app.role.admin');
    } else {
      let roles: string[] = JSON.parse(userTmp.role);
      return roles.length > 0 ? roles[0] : '';
    }
  }

  private destroy$ = new Subject<void>();

  constructor(
    private settings: SettingsService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private aiChatModalService: AiChatModalService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openChatModal(): void {
    this.aiChatModalService.openChatModal();
  }
}
