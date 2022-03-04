import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { TitleService } from '@delon/theme';
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
    private i18n: I18NService,
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
          this.paramDefines = message.data;
          this.params = [];
          this.paramDefines.forEach(define => {
            let param = new Param();
            param.field = define.field;
            param.type = define.type === 'number' ? 0 : 1;
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
            this.params.push(param);
          });
        } else {
          console.warn(message.msg);
        }
      });
  }

  onHostChange(hostValue: string) {
    this.monitor.name = `${this.monitor.app.toUpperCase()}_${hostValue}`;
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
    let addMonitor = {
      detected: this.detected,
      monitor: this.monitor,
      params: this.params
    };
    this.isSpinning = true;
    this.monitorSvc.newMonitor(addMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success('新增监控成功', '');
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`);
        } else {
          this.notifySvc.error('新增监控失败', message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error('新增监控失败', error.error.msg);
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
    let detectMonitor = {
      detected: true,
      monitor: this.monitor,
      params: this.params
    };
    this.isSpinning = true;
    this.monitorSvc.detectMonitor(detectMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success('探测成功', '');
        } else {
          this.notifySvc.error('探测失败', message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error('探测异常', error.error.msg);
      }
    );
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`);
  }
}
