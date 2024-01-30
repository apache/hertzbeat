import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs';

import { Message } from '../../pojo/Message';
import { StatusPageComponentStatus } from '../../pojo/StatusPageComponentStatus';
import { StatusPageHistory } from '../../pojo/StatusPageHistory';
import { StatusPageOrg } from '../../pojo/StatusPageOrg';
import { StatusPagePublicService } from '../../service/status-page-public.service';

@Component({
  selector: 'app-status-public',
  templateUrl: './status-public.component.html',
  styleUrls: ['./status-public.component.less']
})
export class StatusPublicComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private titleService: TitleService,
    private statusPagePublicService: StatusPagePublicService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  statusOrg: StatusPageOrg = new StatusPageOrg();
  componentStatus!: StatusPageComponentStatus[];
  loading: boolean = false;

  ngOnInit(): void {
    this.loadStatusPageOrg();
  }

  loadStatusPageOrg() {
    this.loading = true;
    let loadInit$ = this.statusPagePublicService
      .getStatusPageOrg()
      .pipe(
        switchMap((message: Message<StatusPageOrg>) => {
          if (message.code === 0) {
            this.statusOrg = message.data;
            this.titleService.setTitle(`${this.statusOrg.name} ${this.i18nSvc.fanyi('menu.extras.status')}`);
          } else {
            this.statusOrg = new StatusPageOrg();
            console.log(message.msg);
            this.notifySvc.error(message.msg, '');
            throw new Error(message.msg);
          }
          return this.statusPagePublicService.getStatusPageComponents();
        })
      )
      .subscribe(
        (message: Message<StatusPageComponentStatus[]>) => {
          this.componentStatus = message.data;
          this.loading = false;
          loadInit$.unsubscribe();
        },
        error => {
          this.loading = false;
          loadInit$.unsubscribe();
        }
      );
  }

  calculateHistoryBlockRgb(history: StatusPageHistory): string {
    if (history.state == 0) {
      return 'green';
    } else if (history.state == 2) {
      return 'rgb(200 200 200)';
    } else {
      return `rgb(255, ${(history.uptime * 300).toFixed(0)}, 0)`;
    }
  }

  protected readonly Array = Array;
}
