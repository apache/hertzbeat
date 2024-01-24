import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs';

import { Message } from '../../../pojo/Message';
import { TagItem } from '../../../pojo/NoticeRule';
import { StatusPageComponent } from '../../../pojo/StatusPageComponent';
import { StatusPageOrg } from '../../../pojo/StatusPageOrg';
import { StatusPageService } from '../../../service/status-page.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.less']
})
export class StatusComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private statusPageService: StatusPageService,
    private tagService: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  statusOrg: StatusPageOrg = new StatusPageOrg();
  statusComponents!: StatusPageComponent[];
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

  onNewStatusComponent() {
    this.isManageModalAdd = true;
    this.currentStatusComponent = new StatusPageComponent();
    this.matchTag = '';
    this.currentComponentVisible = true;
  }

  onEditOneComponent(data: StatusPageComponent) {
    this.isManageModalAdd = false;
    this.currentStatusComponent = data;
    if (this.currentStatusComponent.tag != undefined) {
      this.matchTag = this.sliceTagName(this.currentStatusComponent.tag);
      this.tagsOption.push({
        value: this.matchTag,
        label: this.matchTag
      });
    }
    this.currentComponentVisible = true;
  }

  onManageModalCancel() {
    this.isManageModalAdd = true;
    this.currentStatusComponent = new StatusPageComponent();
    this.currentComponentVisible = false;
  }

  onManageModalOk() {
    if (this.matchTag != undefined && this.matchTag.trim() != '') {
      let tmp: string[] = this.matchTag.split(':');
      let tagItem = new TagItem();
      if (tmp.length == 1) {
        tagItem.name = tmp[0];
      } else if (tmp.length == 2) {
        tagItem.name = tmp[0];
        tagItem.value = tmp[1];
      }
      this.currentStatusComponent.tag = tagItem;
    }
    if (this.statusOrg.id == undefined) {
      this.notifySvc.warning(this.i18nSvc.fanyi('status.component.notify.need-org'), '');
      return;
    }
    this.currentStatusComponent.orgId = this.statusOrg.id;
    if (this.isManageModalAdd) {
      this.statusPageService.newStatusPageComponent(this.currentStatusComponent).subscribe(
        (message: Message<void>) => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
            this.sync();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), '');
        }
      );
    } else {
      this.statusPageService.editStatusPageComponent(this.currentStatusComponent).subscribe(
        (message: Message<void>) => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
            this.sync();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), '');
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('app.setting.status.save.error'), '');
        }
      );
    }
    this.onManageModalCancel();
  }

  deleteStatusComponent(id: number) {
    this.statusPageService.deleteStatusPageComponent(id).subscribe(
      (message: Message<void>) => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.sync();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), '');
      }
    );
    this.onManageModalCancel();
  }

  onDeleteOneComponent(id: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteStatusComponent(id)
    });
  }

  loadTagsOption() {
    let tagsInit$ = this.tagService.loadTags(undefined, undefined, 0, 1000).subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.tagsOption = [];
          if (page.content != undefined) {
            page.content.forEach(item => {
              let tag = `${item.name}`;
              if (item.value != undefined) {
                tag = `${tag}:${item.value}`;
              }
              this.tagsOption.push({
                value: tag,
                label: tag
              });
            });
          }
        } else {
          console.warn(message.msg);
        }
        tagsInit$.unsubscribe();
      },
      error => {
        tagsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  sliceTagName(tag: TagItem): string {
    if (tag == undefined) {
      return '';
    }
    if (tag.value != undefined && tag.value.trim() != '') {
      return `${tag.name}:${tag.value}`;
    } else {
      return tag.name;
    }
  }
}
