import { ChangeDetectionStrategy, Component, HostListener, Inject } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
  selector: 'header-clear-storage',
  template: `
    <i nz-icon class="mr-sm" nzType="tool"></i>
    {{ 'menu.clear.local.storage' | i18n }}
  `,
  host: {
    '[class.d-block]': 'true'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderClearStorageComponent {
  constructor(
    private modalSrv: NzModalService,
    private messageSrv: NzMessageService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @HostListener('click')
  _click(): void {
    this.modalSrv.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.clear-cache'),
      nzOnOk: () => {
        localStorage.clear();
        this.messageSrv.success(this.i18nSvc.fanyi('common.notify.clear-success'));
      }
    });
  }
}
