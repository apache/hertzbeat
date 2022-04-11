import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

@Component({
  selector: 'layout-passport',
  templateUrl: './passport.component.html',
  styleUrls: ['./passport.component.less']
})
export class LayoutPassportComponent implements OnInit {
  links = [
    {
      title: this.i18nSvc.fanyi('app.passport.welcome'),
      href: 'https://tancloud.cn'
    }
  ];

  constructor(@Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnInit(): void {
    this.tokenService.clear();
  }
}
