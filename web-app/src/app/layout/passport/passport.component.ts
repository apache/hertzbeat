import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { CONSTANTS } from '../../shared/constants';

@Component({
  selector: 'layout-passport',
  templateUrl: './passport.component.html',
  styleUrls: ['./passport.component.less']
})
export class LayoutPassportComponent implements OnInit {
  version = CONSTANTS.VERSION;

  currentYear = new Date().getFullYear();

  constructor(@Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnInit(): void {
    this.tokenService.clear();
  }
}
