import { DOCUMENT } from '@angular/common';
import { enableProdMode, EnvironmentInjector, ViewEncapsulation, Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { stepPreloader } from '@delon/theme';
import { NzSafeAny } from 'ng-zorro-antd/core/types';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

const injector = Injector.create({
  providers: [
    { provide: PLATFORM_ID, useValue: 'browser' },
    {
      provide: DOCUMENT,
      useFactory: () => {
        return document;
      }
    }
  ]
}) as EnvironmentInjector;

let preloaderDone!: () => void;
runInInjectionContext(injector, () => (preloaderDone = stepPreloader()));
preloaderDone();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    defaultEncapsulation: ViewEncapsulation.Emulated,
    preserveWhitespaces: false
  })
  .then(res => {
    const win = window as NzSafeAny;
    if (win && win.appBootstrap) {
      win.appBootstrap();
    }
    return res;
  })
  .catch(err => console.error(err));
