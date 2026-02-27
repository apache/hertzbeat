import { NgModule, Optional, SkipSelf } from '@angular/core';

import { I18NService } from './i18n/i18n.service';
import { throwIfAlreadyLoaded } from './module-import-guard';

@NgModule({
  providers: [I18NService]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    throwIfAlreadyLoaded(parentModule, 'CoreModule');
  }
}
