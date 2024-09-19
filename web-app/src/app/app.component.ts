import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, Renderer2 } from '@angular/core';
import { NavigationEnd, NavigationError, RouteConfigLoadStart, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService, VERSION as VERSION_ALAIN } from '@delon/theme';
import { environment } from '@env/environment';
import { NzModalService } from 'ng-zorro-antd/modal';
import { VERSION as VERSION_ZORRO } from 'ng-zorro-antd/version';

import { ThemeService } from './service/theme.service';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <app-chatbot></app-chatbot>
  `
})
export class AppComponent implements OnInit {
  constructor(
    el: ElementRef,
    renderer: Renderer2,
    private router: Router,
    private titleSrv: TitleService,
    private modalSrv: NzModalService,
    private themeService: ThemeService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {
    renderer.setAttribute(el.nativeElement, 'ng-alain-version', VERSION_ALAIN.full);
    renderer.setAttribute(el.nativeElement, 'ng-zorro-version', VERSION_ZORRO.full);
  }

  ngOnInit(): void {
    let configLoad = false;
    this.router.events.subscribe(ev => {
      if (ev instanceof RouteConfigLoadStart) {
        configLoad = true;
      }
      if (configLoad && ev instanceof NavigationError) {
        this.modalSrv.confirm({
          nzTitle: this.i18nSvc.fanyi('common.notice'),
          nzContent: environment.production
            ? `New version may have been published, please click refresh.`
            : `Can not resolve route：${ev.url}`,
          nzCancelDisabled: false,
          nzOkText: this.i18nSvc.fanyi('common.refresh'),
          nzCancelText: this.i18nSvc.fanyi('common.ignore'),
          nzOnOk: () => location.reload()
        });
      }
      if (ev instanceof NavigationEnd) {
        this.titleSrv.setTitle();
        this.modalSrv.closeAll();
      }
    });
    // set theme
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      this.themeService.changeTheme(storedTheme);
    }
  }
}
