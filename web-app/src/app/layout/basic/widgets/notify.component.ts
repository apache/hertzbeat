import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { NoticeIconSelect, NoticeItem } from '@delon/abc/notice-icon';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzI18nService } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AlertService } from '../../../service/alert.service';

@Component({
  selector: 'header-notify',
  template: `
    <notice-icon
      [data]="data"
      [count]="count"
      [loading]="loading"
      btnClass="alain-default__nav-item"
      btnIconClass="alain-default__nav-item-icon"
      (clear)="gotoAlertCenter($event)"
      (popoverVisibleChange)="loadData()"
    ></notice-icon>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderNotifyComponent implements OnInit {
  data: NoticeItem[] = [
    {
      title: this.i18nSvc.fanyi('dashboard.alerts.title-no'),
      list: [],
      emptyText: this.i18nSvc.fanyi('dashboard.alerts.no'),
      emptyImage: 'https://gw.alipayobjects.com/zos/rmsportal/wAhyIChODzsoKIOBHcBk.svg',
      clearText: this.i18nSvc.fanyi('dashboard.alerts.enter')
    }
  ];
  count = 0;
  loading = false;

  constructor(
    private msg: NzMessageService,
    private nzI18n: NzI18nService,
    private router: Router,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private alertSvc: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    let loadAlerts$ = this.alertSvc.loadAlerts(0, undefined, undefined, 0, 5).subscribe(
      message => {
        loadAlerts$.unsubscribe();
        if (message.code === 0) {
          let page = message.data;
          let alerts = page.content;
          if (alerts == undefined) {
            this.loading = false;
            return;
          }
          this.data[0].list = [];
          alerts.forEach(alert => {
            let item = {
              id: alert.id,
              avatar: 'https://gw.alipayobjects.com/zos/rmsportal/ThXAXghbEsBCCSDihZxY.png',
              title: `${alert.monitorName}--${this.i18nSvc.fanyi(`alert.priority.${alert.priority}`)}`,
              datetime: alert.gmtCreate,
              color: 'blue',
              type: this.i18nSvc.fanyi('dashboard.alerts.title-no')
            };
            this.data[0].list.push(item);
          });
          this.count = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error => {
        loadAlerts$.unsubscribe();
        console.error(error.msg);
        this.loading = false;
      }
    );
  }

  gotoAlertCenter(type: string): void {
    this.router.navigateByUrl(`/alert/center`);
  }

  select(res: NoticeIconSelect): void {
    this.msg.success(`点击了 ${res.title} 的 ${res.item.title}`);
  }
}
