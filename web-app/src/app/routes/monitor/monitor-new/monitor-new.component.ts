import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs/operators';

import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-add',
  templateUrl: './monitor-new.component.html',
  styles: []
})
export class MonitorNewComponent implements OnInit {
  paramDefines!: ParamDefine[];
  params!: Param[];
  advancedParamDefines!: ParamDefine[];
  advancedParams!: Param[];
  monitor!: Monitor;
  detected: boolean = true;
  passwordVisible: boolean = false;
  // 是否显示加载中
  isSpinning: boolean = false;
  constructor(
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private router: Router,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private titleSvc: TitleService,
    private formBuilder: FormBuilder
  ) {
    this.monitor = new Monitor();
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.monitor.app = paramMap.get('app') || '';
          this.titleSvc.setTitleByI18n(`monitor.app.${this.monitor.app}`);
          this.detected = true;
          this.passwordVisible = false;
          this.isSpinning = false;
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
            let param = new Param();
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
            if (define.defaultValue != undefined) {
              if (define.type === 'number') {
                param.value = Number(define.defaultValue);
              } else if (define.type === 'boolean') {
                param.value = define.defaultValue.toLowerCase() == 'true';
              } else {
                param.value = define.defaultValue;
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

  onHostChange(hostValue: string) {
    this.monitor.name = `${this.monitor.app.toUpperCase()}_${hostValue}`;
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
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.new.failed'), error.error.msg);
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
