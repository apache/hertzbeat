import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-modify',
  templateUrl: './monitor-edit.component.html',
  styles: []
})
export class MonitorEditComponent implements OnInit {
  constructor(
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private router: Router,
    private titleSvc: TitleService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  paramDefines!: ParamDefine[];
  params!: Param[];
  advancedParamDefines!: ParamDefine[];
  advancedParams!: Param[];
  paramValueMap = new Map<String, Param>();
  monitor = new Monitor();
  profileForm: FormGroup = new FormGroup({});
  detected: boolean = true;
  passwordVisible: boolean = false;
  isSpinning: boolean = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.isSpinning = false;
          this.passwordVisible = false;
          let id = paramMap.get('monitorId');
          this.monitor.id = Number(id);
          // 查询监控信息
          return this.monitorSvc.getMonitor(this.monitor.id);
        })
      )
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code === 0) {
            this.monitor = message.data.monitor;
            this.titleSvc.setTitleByI18n(`monitor.app.${this.monitor.app}`);
            if (message.data.params != null) {
              message.data.params.forEach((item: Param) => {
                this.paramValueMap.set(item.field, item);
              });
            }
            this.detected = message.data.detected ? message.data.detected : true;
          } else {
            console.warn(message.msg);
            this.notifySvc.error(this.i18nSvc.fanyi('monitors.not-found'), message.msg);
            return throwError(this.i18nSvc.fanyi('monitors.not-found'));
          }
          return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
        })
      )
      .subscribe(message => {
        if (message.code === 0) {
          this.params = [];
          this.advancedParams = [];
          this.paramDefines = [];
          this.advancedParamDefines = [];
          message.data.forEach(define => {
            let param = this.paramValueMap.get(define.field);
            if (param === undefined) {
              param = new Param();
              param.field = define.field;
              if (define.type === 'number') {
                param.type = 0;
              } else if (define.type === 'key-value') {
                param.type = 3;
              } else {
                param.type = 1;
              }
              if (define.type === 'boolean') {
                param.value = false;
              }
              if (param.field === 'host') {
                param.value = this.monitor.host;
              }
            } else {
              if (define.type === 'boolean') {
                if (param.value != null) {
                  param.value = param.value.toLowerCase() == 'true';
                } else {
                  param.value = false;
                }
              }
            }
            if (define.hide) {
              this.advancedParams.push(param);
              this.advancedParamDefines.push(define);
            } else {
              this.params.push(param);
              this.paramDefines.push(define);
            }
          });
        } else {
          console.warn(message.msg);
        }
      });
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
      monitor: this.monitor,
      params: this.params.concat(this.advancedParams)
    };
    this.isSpinning = true;
    this.monitorSvc.editMonitor(addMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitors.edit.success'), '');
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`);
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitors.edit.failed'), message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.edit.failed'), error.error.msg);
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
      detected: this.detected,
      monitor: this.monitor,
      params: this.params.concat(this.advancedParams)
    };
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
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.detect.failed'), error.error.msg);
      }
    );
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`);
  }
}
