import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs/operators';

import { Collector } from '../../../pojo/Collector';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { Tag } from '../../../pojo/Tag';
import { AppDefineService } from '../../../service/app-define.service';
import { CollectorService } from '../../../service/collector.service';
import { MonitorService } from '../../../service/monitor.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-monitor-add',
  templateUrl: './monitor-new.component.html',
  styles: []
})
export class MonitorNewComponent implements OnInit {
  paramDefines!: ParamDefine[];
  hostName!: string;
  params!: Param[];
  advancedParamDefines!: ParamDefine[];
  advancedParams!: Param[];
  monitor!: Monitor;
  collectors!: Collector[];
  collector: string = '';
  detected: boolean = false;
  passwordVisible: boolean = false;
  // 是否显示加载中
  isSpinning: boolean = false;
  spinningTip: string = 'Loading...';
  constructor(
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private router: Router,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private titleSvc: TitleService,
    private tagSvc: TagService,
    private collectorSvc: CollectorService,
    private formBuilder: FormBuilder
  ) {
    this.monitor = new Monitor();
    this.monitor.tags = [];
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.monitor.app = paramMap.get('app') || '';
          if (this.monitor.app == '') {
            this.router.navigateByUrl('/monitors/new?app=website');
          }
          this.titleSvc.setTitleByI18n(`monitor.app.${this.monitor.app}`);
          this.detected = false;
          this.passwordVisible = false;
          this.isSpinning = true;
          return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
        })
      )
      .pipe(
        switchMap((message: Message<ParamDefine[]>) => {
          if (message.code === 0) {
            this.params = [];
            this.advancedParams = [];
            this.paramDefines = [];
            this.advancedParamDefines = [];
            message.data.forEach(define => {
              let param = new Param();
              param.field = define.field;
              if (define.type === 'number') {
                param.type = 0;
              } else if (define.type === 'key-value') {
                param.type = 3;
              } else if (define.type === 'array') {
                param.type = 4;
              } else {
                param.type = 1;
              }
              if (define.type === 'boolean') {
                param.value = false;
              }
              if (define.defaultValue != undefined) {
                if (define.type === 'number') {
                  param.value = Number(define.defaultValue);
                } else if (define.type === 'boolean') {
                  param.value = define.defaultValue.toLowerCase() == 'true';
                } else {
                  param.value = define.defaultValue;
                }
              }
              define.name = this.i18nSvc.fanyi(`monitor.app.${this.monitor.app}.param.${define.field}`);
              if (define.hide) {
                this.advancedParams.push(param);
                this.advancedParamDefines.push(define);
              } else {
                this.params.push(param);
                this.paramDefines.push(define);
              }
              if (
                define.field == 'host' &&
                define.type == 'host' &&
                define.name != `monitor.app.${this.monitor.app}.param.${define.field}`
              ) {
                this.hostName = define.name;
              }
            });
          } else {
            console.warn(message.msg);
          }
          return this.collectorSvc.getCollectors();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.collectors = message.data.content?.map(item => item.collector);
          } else {
            console.warn(message.msg);
          }
          this.isSpinning = false;
        },
        error => {
          this.isSpinning = true;
        }
      );
  }

  onHostChange(hostValue: string) {
    if (this.monitor.app != 'prometheus') {
      let autoName = `${this.monitor.app.toUpperCase()}_${hostValue}`;
      if (this.monitor.name == undefined || this.monitor.name == '' || this.monitor.name.startsWith(this.monitor.app.toUpperCase())) {
        this.monitor.name = autoName;
      }
    }
  }

  onParamBooleanChanged(booleanValue: boolean, field: string) {
    // 对SSL的端口联动处理, 不开启SSL默认80端口，开启SSL默认443
    if (field === 'ssl') {
      this.params.forEach(param => {
        if (param.field === 'port') {
          if (booleanValue) {
            param.value = '443';
          } else {
            param.value = '80';
          }
        }
      });
    }
  }

  onSubmit(formGroup: FormGroup) {
    if (formGroup.invalid) {
      Object.values(formGroup.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.monitor.host = this.monitor.host.trim();
    this.monitor.name = this.monitor.name.trim();
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === 'host') {
        param.value = this.monitor.host;
      }
      if (param.value != null && typeof param.value == 'string') {
        param.value = (param.value as string).trim();
      }
    });
    this.advancedParams.forEach(param => {
      if (param.value != null && typeof param.value == 'string') {
        param.value = (param.value as string).trim();
      }
    });
    let addMonitor = {
      detected: this.detected,
      collector: this.collector,
      monitor: this.monitor,
      params: this.params.concat(this.advancedParams)
    };
    if (this.detected) {
      this.spinningTip = this.i18nSvc.fanyi('monitors.spinning-tip.detecting');
    } else {
      this.spinningTip = 'Loading...';
    }
    this.isSpinning = true;
    this.monitorSvc.newMonitor(addMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitors.new.success'), '');
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`);
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitors.new.failed'), message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.new.failed'), error.msg);
      }
    );
  }

  onDetect(formGroup: FormGroup) {
    if (formGroup.invalid) {
      Object.values(formGroup.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.monitor.host = this.monitor.host.trim();
    this.monitor.name = this.monitor.name.trim();
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === 'host') {
        param.value = this.monitor.host;
      }
      if (param.value != null && typeof param.value == 'string') {
        param.value = (param.value as string).trim();
      }
    });
    this.advancedParams.forEach(param => {
      if (param.value != null && typeof param.value == 'string') {
        param.value = (param.value as string).trim();
      }
    });
    let detectMonitor = {
      detected: true,
      collector: this.collector,
      monitor: this.monitor,
      params: this.params.concat(this.advancedParams)
    };
    this.spinningTip = this.i18nSvc.fanyi('monitors.spinning-tip.detecting');
    this.isSpinning = true;
    this.monitorSvc.detectMonitor(detectMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitors.detect.success'), '');
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitors.detect.failed'), message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.detect.failed'), error.msg);
      }
    );
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`);
  }

  onRemoveTag(tag: Tag) {
    if (this.monitor != undefined && this.monitor.tags != undefined) {
      this.monitor.tags = this.monitor.tags.filter(item => item !== tag);
    }
  }

  sliceTagName(tag: Tag): string {
    if (tag.value != undefined && tag.value.trim() != '') {
      return `${tag.name}:${tag.value}`;
    } else {
      return tag.name;
    }
  }

  // start Tag model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  tagCheckedAll: boolean = false;
  tagTableLoading = false;
  tagSearch!: string;
  tags!: Tag[];
  checkedTags = new Set<Tag>();
  loadTagsTable() {
    this.tagTableLoading = true;
    let tagsReq$ = this.tagSvc.loadTags(this.tagSearch, 1, 0, 1000).subscribe(
      message => {
        this.tagTableLoading = false;
        this.tagCheckedAll = false;
        this.checkedTags.clear();
        if (message.code === 0) {
          let page = message.data;
          this.tags = page.content;
        } else {
          console.warn(message.msg);
        }
        tagsReq$.unsubscribe();
      },
      error => {
        this.tagTableLoading = false;
        tagsReq$.unsubscribe();
      }
    );
  }
  onShowTagsModal() {
    this.isManageModalVisible = true;
    this.loadTagsTable();
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }
  onManageModalOk() {
    this.isManageModalOkLoading = true;
    this.checkedTags.forEach(item => {
      if (this.monitor.tags.find(tag => tag.id == item.id) == undefined) {
        this.monitor.tags.push(item);
      }
    });
    this.isManageModalOkLoading = false;
    this.isManageModalVisible = false;
  }
  onAllChecked(checked: boolean) {
    if (checked) {
      this.tags.forEach(tag => this.checkedTags.add(tag));
    } else {
      this.checkedTags.clear();
    }
  }
  onItemChecked(tag: Tag, checked: boolean) {
    if (checked) {
      this.checkedTags.add(tag);
    } else {
      this.checkedTags.delete(tag);
    }
  }

  getNumber(rangeString: string, index: number): number | undefined {
    if (rangeString == undefined || rangeString == '' || rangeString.length <= index) {
      return undefined;
    }
    const rangeArray = JSON.parse(rangeString);
    return rangeArray[index];
  }
  // end tag model
}
