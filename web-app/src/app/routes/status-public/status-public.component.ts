import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs';

import { Message } from '../../pojo/Message';
import { StatusPageComponent } from '../../pojo/StatusPageComponent';
import { StatusPageComponentStatus } from '../../pojo/StatusPageComponentStatus';
import { StatusPageOrg } from '../../pojo/StatusPageOrg';
import { StatusPageService } from '../../service/status-page.service';

@Component({
  selector: 'app-status-public',
  templateUrl: './status-public.component.html',
  styleUrls: ['./status-public.component.less']
})
export class StatusPublicComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private statusPageService: StatusPageService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  statusOrg: StatusPageOrg = new StatusPageOrg();
  statusComponents!: StatusPageComponent[];
  componentStatus!: StatusPageComponentStatus[];
  loading: boolean = false;
  currentStatusComponent!: StatusPageComponent;
  currentComponentLoading: boolean = false;
  currentComponentVisible: boolean = false;
  isManageModalAdd: boolean = true;

  search!: string;
  tagsOption: any[] = [];
  matchTag: string = '';

  ngOnInit(): void {
    this.loadStatusPageConfig();
  }

  sync() {
    this.loadStatusPageConfig();
  }

  loadStatusPageConfig() {
    this.loading = true;
    let loadInit$ = this.statusPageService
      .getStatusPageOrg()
      .pipe(
        switchMap((message: Message<StatusPageOrg>) => {
          if (message.code === 0) {
            this.statusOrg = message.data;
          } else {
            this.statusOrg = new StatusPageOrg();
            console.log(message.msg);
          }
          return this.statusPageService.getStatusPageComponents();
        })
      )
      .subscribe(
        (message: Message<StatusPageComponent[]>) => {
          this.statusComponents = message.data;
          this.loading = false;
          loadInit$.unsubscribe();
        },
        error => {
          this.loading = false;
          loadInit$.unsubscribe();
        }
      );
  }

  onSaveStatusOrg(form: FormGroup) {
    if (form.invalid) {
      Object.values(form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    let saveStatus$ = this.statusPageService.saveStatusPageOrg(this.statusOrg).subscribe(
      (message: Message<StatusPageOrg>) => {
        if (message.code === 0) {
          this.statusOrg = message.data;
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
        }
        saveStatus$.unsubscribe();
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), '');
        saveStatus$.unsubscribe();
      }
    );
  }
}
