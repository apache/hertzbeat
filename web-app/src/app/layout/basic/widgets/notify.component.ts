import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzI18nService } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';

import { AlertService } from '../../../service/alert.service';

@Component({
  selector: 'header-notify',
  template: `
    <ng-template #badgeTpl>
      <nz-badge [nzCount]="count" ngClass="alain-default__nav-item" [nzStyle]="{ 'box-shadow': 'none' }">
        <i nz-icon nzType="bell" ngClass="alain-default__nav-item-icon"></i>
      </nz-badge>
    </ng-template>
    @if (data!.length <= 0) {<ng-template [ngTemplateOutlet]="badgeTpl" />} @else {<div
      nz-dropdown
      (nzVisibleChange)="onPopoverVisibleChange($event)"
      nzTrigger="click"
      nzPlacement="bottomRight"
      nzOverlayClassName="header-dropdown notice-icon"
      [nzDropdownMenu]="noticeMenu"
    >
      <ng-template [ngTemplateOutlet]="badgeTpl" />
    </div>
    <nz-dropdown-menu #noticeMenu="nzDropdownMenu">
      @if (data[0].title) {<div class="ant-modal-title" style="line-height: 44px; text-align: center;">{{ data[0].title }}</div>
      }
      <nz-spin [nzSpinning]="loading" [nzDelay]="0">
        @if (data[0].list && data[0].list.length > 0) {<ng-template [ngTemplateOutlet]="listTpl" />} @else {<div
          class="notice-icon__notfound"
        >
          @if (data[0].emptyImage) {<img class="notice-icon__notfound-img" [attr.src]="data[0].emptyImage" alt="not found" />
          }
          <p>
            <ng-container *nzStringTemplateOutlet="data[0].emptyText">
              {{ data[0].emptyText }}
            </ng-container>
          </p>
        </div>
        }
      </nz-spin>
    </nz-dropdown-menu>
    }
    <ng-template #listTpl>
      <nz-list [nzDataSource]="data[0].list" [nzRenderItem]="item">
        <ng-template #item let-item>
          <nz-list-item [class.notice-icon__item-read]="item.read">
            <nz-list-item-meta [nzTitle]="nzTitle" [nzDescription]="nzDescription" [nzAvatar]="item.avatar">
              <ng-template #nzTitle>
                <ng-container *nzStringTemplateOutlet="item.title; context: { $implicit: item }">
                  {{ item.title }}
                </ng-container>
                @if (item.extra) {<div class="notice-icon__item-extra">
                  <nz-tag [nzColor]="item.color">{{ item.extra }}</nz-tag>
                </div>
                }
              </ng-template>
              <ng-template #nzDescription>
                @if (item.description) {<div class="notice-icon__item-desc">
                  <ng-container *nzStringTemplateOutlet="item.description; context: { $implicit: item }">
                    {{ item.description }}
                  </ng-container>
                </div>
                } @if (item.datetime) {<div class="notice-icon__item-time">{{ item.datetime }}</div>
                }
              </ng-template>
            </nz-list-item-meta>
          </nz-list-item>
        </ng-template>
      </nz-list>
      <div class="notice-icon__clear" (click)="gotoAlertCenter()">{{ data[0].clearText }}</div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderNotifyComponent implements OnInit {
  data: any[] = [
    {
      title: this.i18nSvc.fanyi('dashboard.alerts.title-no'),
      list: [],
      emptyText: this.i18nSvc.fanyi('dashboard.alerts.no'),
      emptyImage: '/assets/img/empty-full.svg',
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

  onPopoverVisibleChange(visible: boolean): void {
    if (visible) {
      this.loadData();
    }
  }

  updateNoticeData(notices: any[]): any[] {
    const data = this.data.slice();
    data.forEach(i => (i.list = []));

    notices.forEach(item => {
      data[0].list.push({ ...item });
    });
    return data;
  }

  loadData(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    let loadAlerts$ = this.alertSvc
      .loadAlerts(0, undefined, undefined, 0, 5)
      .pipe(
        finalize(() => {
          loadAlerts$.unsubscribe();
          this.loading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            let page = message.data;
            let alerts = page.content;
            if (alerts == undefined) {
              return;
            }
            let list: any[] = [];
            alerts.forEach(alert => {
              let item = {
                id: alert.id,
                avatar: '/assets/img/notification.svg',
                title: `${alert.tags?.monitorName}--${this.i18nSvc.fanyi(`alert.priority.${alert.priority}`)}`,
                datetime: new Date(alert.lastAlarmTime).toLocaleString(),
                color: 'blue',
                type: this.i18nSvc.fanyi('dashboard.alerts.title-no')
              };
              list.push(item);
            });
            this.data = this.updateNoticeData(list);
            this.count = page.totalElements;
          } else {
            console.warn(message.msg);
          }
          this.cdr.detectChanges();
        },
        error => {
          console.error(error);
        }
      );
  }

  gotoAlertCenter(): void {
    this.router.navigateByUrl(`/alert/center`);
  }
}
