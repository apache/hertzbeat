import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { Mute } from '../../../pojo/Mute';
import { AlertSoundService } from '../../../service/alert-sound.service';
import { AlertService } from '../../../service/alert.service';
import { GeneralConfigService } from '../../../service/general-config.service';

@Component({
  selector: 'header-notify',
  template: `
    <div style="display: flex; align-items: center;">
      <ng-template #badgeTpl>
        <nz-badge [nzCount]="count" ngClass="alain-default__nav-item" [nzStyle]="{ 'box-shadow': 'none' }">
          <i nz-icon nzType="bell" ngClass="alain-default__nav-item-icon"></i>
        </nz-badge>
      </ng-template>
      @if (data!.length <= 0) {
      <ng-template [ngTemplateOutlet]="badgeTpl" />
      } @else {
      <div
        nz-dropdown
        (nzVisibleChange)="onPopoverVisibleChange($event)"
        [(nzVisible)]="popoverVisible"
        nzTrigger="click"
        nzPlacement="bottomRight"
        nzOverlayClassName="header-dropdown notice-icon"
        [nzDropdownMenu]="noticeMenu"
      >
        <ng-template [ngTemplateOutlet]="badgeTpl" />
      </div>
      }
      <nz-badge ngClass="alain-default__nav-item" [nzStyle]="{ 'box-shadow': 'none' }">
        <i
          nz-icon
          [nzType]="mute.mute ? 'muted' : 'sound'"
          ngClass="alain-default__nav-item-icon"
          (click)="toggleMute($event)"
          nz-tooltip
          [nzTooltipTitle]="'common.mute' | i18n"
        ></i>
      </nz-badge>
    </div>
    <nz-dropdown-menu #noticeMenu="nzDropdownMenu">
      @if (data[0].title) {
      <div class="ant-modal-title" style="line-height: 44px; text-align: center;">{{ data[0].title }}</div>
      }
      <nz-spin [nzSpinning]="loading" [nzDelay]="0">
        @if (data[0].list && data[0].list.length > 0) {
        <ng-template [ngTemplateOutlet]="listTpl" />
        } @else {
        <div class="notice-icon__notfound">
          @if (data[0].emptyImage) {
          <img class="notice-icon__notfound-img" [attr.src]="data[0].emptyImage" alt="not found" />
          }
          <p>
            <ng-container *nzStringTemplateOutlet="data[0].emptyText">
              {{ data[0].emptyText }}
            </ng-container>
          </p>
        </div>
        }
      </nz-spin>
      <div style="display: flex; align-items: center; border-top: 1px solid #f0f0f0;">
        <div class="notice-icon__clear" style="flex: 1; border-top: none;" (click)="gotoAlertCenter()">{{ data[0].enterText }}</div>
      </div>
    </nz-dropdown-menu>
    <ng-template #listTpl>
      <nz-list [nzDataSource]="data[0].list" [nzRenderItem]="item">
        <ng-template #item let-item>
          <nz-list-item [class.notice-icon__item-read]="item.read">
            <nz-list-item-meta [nzTitle]="nzTitle" [nzDescription]="nzDescription" [nzAvatar]="item.avatar">
              <ng-template #nzTitle>
                <ng-container *nzStringTemplateOutlet="item.title; context: { $implicit: item }">
                  <a (click)="gotoDetail(item.id)">{{ item.title }}</a>
                </ng-container>
                @if (item.extra) {
                <div class="notice-icon__item-extra">
                  <nz-tag [nzColor]="item.color">{{ item.extra }}</nz-tag>
                </div>
                }
              </ng-template>
              <ng-template #nzDescription>
                @if (item.description) {
                <div class="notice-icon__item-desc">
                  <ng-container *nzStringTemplateOutlet="item.description; context: { $implicit: item }">
                    {{ item.description }}
                  </ng-container>
                </div>
                } @if (item.datetime) {
                <div class="notice-icon__item-time">{{ item.datetime }}</div>
                }
              </ng-template>
            </nz-list-item-meta>
          </nz-list-item>
        </ng-template>
      </nz-list>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderNotifyComponent implements OnInit, OnDestroy {
  data: any[] = [
    {
      title: this.i18nSvc.fanyi('dashboard.alerts.title-no'),
      list: [],
      emptyText: this.i18nSvc.fanyi('dashboard.alerts.no'),
      emptyImage: '/assets/img/empty-full.svg',
      enterText: this.i18nSvc.fanyi('dashboard.alerts.enter'),
      clearText: this.i18nSvc.fanyi('alert.center.clear')
    }
  ];
  count = 0;
  loading = false;
  popoverVisible = false;
  refreshInterval: any;
  private previousCount = 0;
  // default to mute status
  mute: Mute = { mute: true };
  constructor(
    private router: Router,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private notifySvc: NzNotificationService,
    private configSvc: GeneralConfigService,
    private alertSvc: AlertService,
    private modal: NzModalService,
    private cdr: ChangeDetectorRef,
    private alertSound: AlertSoundService
  ) {}

  ngOnInit(): void {
    let muteInit$ = this.configSvc
      .getGeneralConfig('mute')
      .pipe(
        finalize(() => {
          muteInit$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.mute = message.data;
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.error(error);
        }
      );
    this.loadData();
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 10000); // every 10 seconds refresh the tabs
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
      .loadAlerts('firing', undefined, 0, 5)
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
                // title: `${alert.tags?.monitorName}--${this.i18nSvc.fanyi(`alert.severity.${alert.severity}`)}`,
                title: alert.content,
                datetime: new Date(alert.activeAt).toLocaleString(),
                color: 'blue',
                status: alert.status,
                type: this.i18nSvc.fanyi('dashboard.alerts.title-no')
              };
              list.push(item);
            });
            this.data = this.updateNoticeData(list);

            if (page.totalElements > this.previousCount && !this.mute.mute) {
              this.alertSound.playAlertSound(this.i18nSvc.currentLang);
            }
            this.previousCount = page.totalElements;
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

  updateAlertsStatus(alertIds: Set<number>, status: string) {
    const markAlertsStatus$ = this.alertSvc.applyGroupAlertsStatus(alertIds, status).subscribe(
      message => {
        markAlertsStatus$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.mark-success'), '');
          this.loadData();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.mark-fail'), message.msg);
        }
      },
      error => {
        markAlertsStatus$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.mark-fail'), error.msg);
      }
    );
  }

  gotoAlertCenter(): void {
    this.popoverVisible = false;
    this.router.navigateByUrl(`/alert/center`);
  }

  gotoDetail(id: number): void {
    this.popoverVisible = false;
    // todo goto this alert detail pop page
    // this.router.navigateByUrl(`/alarm/center/detail/${id}`);
  }

  toggleMute(event: MouseEvent): void {
    event.stopPropagation();
    const updatedMuteState = !this.mute.mute;
    const updatedMuteConfig = { ...this.mute, mute: updatedMuteState };
    let saveConfig$ = this.configSvc
      .saveGeneralConfig(updatedMuteConfig, 'mute')
      .pipe(
        finalize(() => {
          saveConfig$.unsubscribe();
        })
      )
      .subscribe({
        next: response => {
          if (response.code === 0) {
            this.mute = updatedMuteConfig;
            console.log('Config saved successfully', response);
          } else {
            console.warn('Error saving config', response.msg);
          }
        },
        error: error => {
          console.error('Error saving config', error);
        },
        complete: () => {
          this.cdr.markForCheck();
        }
      });
  }
}
