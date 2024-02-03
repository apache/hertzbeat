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
import { StatusPageIncident } from '../../../pojo/StatusPageIncident';
import { StatusPageIncidentContent } from '../../../pojo/StatusPageIncidentContent';
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
  statusIncidences!: StatusPageIncident[];
  loading: boolean = false;
  orgLoading: boolean = false;
  componentLoading: boolean = false;
  incidentLoading: boolean = false;
  currentStatusComponent!: StatusPageComponent;
  currentComponentLoading: boolean = false;
  currentComponentVisible: boolean = false;
  isComponentModalAdd: boolean = true;
  currentStatusIncident!: StatusPageIncident;
  currentIncidentContent!: StatusPageIncidentContent;
  currentIncidentLoading: boolean = false;
  currentIncidentVisible: boolean = false;
  currentIncidentComponentOptions!: any[];
  isIncidentModalAdd: boolean = true;

  search!: string;
  tagsOption: any[] = [];
  matchTag: string = '';

  ngOnInit(): void {
    this.loadStatusPageConfig();
  }

  syncComponent() {
    this.loadComponentInfo();
  }

  syncIncidence() {
    this.loadIncidenceInfo();
  }

  loadOrgInfo() {
    this.orgLoading = true;
    let orgLoad$ = this.statusPageService.getStatusPageOrg().subscribe(
      message => {
        if (message.code === 0) {
          this.statusOrg = message.data;
        } else {
          console.log(message.msg);
        }
        this.orgLoading = false;
        orgLoad$.unsubscribe();
      },
      error => {
        this.orgLoading = false;
        orgLoad$.unsubscribe();
      }
    );
  }

  loadComponentInfo() {
    this.currentComponentLoading = true;
    let componentLoad$ = this.statusPageService.getStatusPageComponents().subscribe(
      message => {
        if (message.code === 0) {
          this.statusComponents = message.data;
        } else {
          console.log(message.msg);
        }
        this.currentComponentLoading = false;
        componentLoad$.unsubscribe();
      },
      error => {
        this.currentComponentLoading = false;
        componentLoad$.unsubscribe();
      }
    );
  }

  loadIncidenceInfo() {
    this.incidentLoading = true;
    let incidenceLoad$ = this.statusPageService.getStatusPageIncidents().subscribe(
      message => {
        if (message.code === 0) {
          this.statusIncidences = message.data;
        } else {
          console.log(message.msg);
        }
        this.incidentLoading = false;
        incidenceLoad$.unsubscribe();
      },
      error => {
        this.incidentLoading = false;
        incidenceLoad$.unsubscribe();
      }
    );
  }

  loadStatusPageConfig() {
    this.orgLoading = true;
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
          this.orgLoading = false;
          loadInit$.unsubscribe();
        },
        error => {
          this.orgLoading = false;
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
    this.isComponentModalAdd = true;
    this.currentStatusComponent = new StatusPageComponent();
    this.matchTag = '';
    this.currentComponentVisible = true;
  }

  onNewStatusIncident() {
    this.isIncidentModalAdd = true;
    this.currentStatusIncident = new StatusPageIncident();
    this.currentIncidentContent = new StatusPageIncidentContent();
    let componentLoad$ = this.statusPageService.getStatusPageComponents().subscribe(
      message => {
        if (message.code === 0) {
          this.currentIncidentComponentOptions = [];
          message.data.forEach(item => {
            this.currentIncidentComponentOptions.push({
              value: item,
              label: item.name,
              checked: false
            });
          });
          this.statusComponents = message.data;
        } else {
          console.log(message.msg);
          this.notifySvc.error(message.msg, '');
        }
        this.currentIncidentVisible = true;
        componentLoad$.unsubscribe();
      },
      error => {
        this.currentIncidentVisible = true;
        this.notifySvc.error(error.msg, '');
        componentLoad$.unsubscribe();
      }
    );
  }

  onEditOneComponent(data: StatusPageComponent) {
    this.isComponentModalAdd = false;
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

  onUpdateOneIncident(incidentId: number) {
    this.isIncidentModalAdd = false;
    this.currentIncidentContent = new StatusPageIncidentContent();
    let loadIncident$ = this.statusPageService
      .getStatusPageComponents()
      .pipe(
        switchMap((message: Message<StatusPageComponent[]>) => {
          if (message.code === 0) {
            this.currentIncidentComponentOptions = [];
            message.data.forEach(item => {
              this.currentIncidentComponentOptions.push({
                value: item,
                label: item.name,
                checked: false
              });
            });
          } else {
            console.log(message.msg);
            this.notifySvc.error(message.msg, '');
          }
          return this.statusPageService.getStatusPageIncident(incidentId);
        })
      )
      .subscribe(
        (message: Message<StatusPageIncident>) => {
          if (message.code === 0) {
            this.currentStatusIncident = message.data;
            if (this.currentStatusIncident.components != undefined) {
              this.currentStatusIncident.components.forEach(item => {
                this.currentIncidentComponentOptions.forEach(option => {
                  if (option.value.id == item.id) {
                    option.checked = true;
                  }
                });
              });
            }
            this.currentStatusIncident.contents.sort((a, b) => {
              return b.timestamp - a.timestamp;
            });
          } else {
            this.notifySvc.error(message.msg, '');
          }
          this.currentIncidentVisible = true;
          loadIncident$.unsubscribe();
        },
        error => {
          this.orgLoading = false;
          loadIncident$.unsubscribe();
        }
      );
  }

  onComponentModalCancel() {
    this.isComponentModalAdd = true;
    this.currentStatusComponent = new StatusPageComponent();
    this.currentComponentVisible = false;
  }

  onIncidentModalCancel() {
    this.isIncidentModalAdd = true;
    this.currentStatusIncident = new StatusPageIncident();
    this.currentIncidentVisible = false;
  }

  onComponentModalOk() {
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
    if (this.isComponentModalAdd) {
      this.statusPageService.newStatusPageComponent(this.currentStatusComponent).subscribe(
        (message: Message<void>) => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
            this.onComponentModalCancel();
            this.syncComponent();
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
            this.onComponentModalCancel();
            this.syncComponent();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), '');
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), '');
        }
      );
    }
  }

  onIncidentModalOk() {
    if (this.statusOrg.id == undefined) {
      this.notifySvc.warning(this.i18nSvc.fanyi('status.component.notify.need-org'), '');
      return;
    }
    // incident message content
    if (this.currentStatusIncident.contents == undefined) {
      this.currentStatusIncident.contents = [];
    }
    this.currentIncidentContent.timestamp = new Date().getTime();
    this.currentIncidentContent.state = this.currentStatusIncident.state;
    this.currentIncidentContent.incidentId = this.currentStatusIncident.id;
    this.currentStatusIncident.contents.push(this.currentIncidentContent);
    // components check options
    let components: StatusPageComponent[] = [];
    this.currentIncidentComponentOptions.forEach(item => {
      if (item.checked) {
        components.push(item.value);
      }
    });
    this.currentStatusIncident.components = components;
    this.currentStatusIncident.orgId = this.statusOrg.id;
    if (this.isIncidentModalAdd) {
      this.statusPageService.newStatusPageIncident(this.currentStatusIncident).subscribe(
        (message: Message<void>) => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
            this.onIncidentModalCancel();
            this.syncIncidence();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            this.onIncidentModalCancel();
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          this.onIncidentModalCancel();
        }
      );
    } else {
      this.statusPageService.editStatusPageIncident(this.currentStatusIncident).subscribe(
        (message: Message<void>) => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
            this.onIncidentModalCancel();
            this.syncIncidence();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            this.onIncidentModalCancel();
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          this.onIncidentModalCancel();
        }
      );
    }
  }

  deleteStatusComponent(id: number) {
    this.statusPageService.deleteStatusPageComponent(id).subscribe(
      (message: Message<void>) => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.syncComponent();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), '');
      }
    );
    this.onComponentModalCancel();
  }

  deleteStatusIncident(id: number) {
    this.statusPageService.deleteStatusPageIncident(id).subscribe(
      (message: Message<void>) => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.syncIncidence();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), '');
      }
    );
    this.onIncidentModalCancel();
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

  onDeleteOneIncident(id: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteStatusIncident(id)
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

  getLatestIncidentContentMsg(incidents: StatusPageIncidentContent[]): string {
    if (incidents == undefined || incidents.length == 0) {
      return '';
    }
    let latestContent: StatusPageIncidentContent = incidents[0];
    incidents.forEach(item => {
      if (item.timestamp > latestContent.timestamp) {
        latestContent = item;
      }
    });
    return latestContent.message;
  }

  sliceStringLength(message: string, maxLength: number): string {
    if (message == undefined || message.trim() == '') {
      return '';
    }
    if (message.length > maxLength) {
      return `${message.slice(0, maxLength)}...`;
    } else {
      return message;
    }
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
