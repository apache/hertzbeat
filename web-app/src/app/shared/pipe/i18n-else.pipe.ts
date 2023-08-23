import { Inject, Pipe, PipeTransform } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

@Pipe({
  name: 'i18nElse'
})
export class I18nElsePipe implements PipeTransform {
  constructor(@Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  transform(token: string, elseValue: string): string {
    let i18nValue = this.i18nSvc.fanyi(token);
    if (i18nValue == token) {
      return elseValue;
    }
    return i18nValue;
  }
}
