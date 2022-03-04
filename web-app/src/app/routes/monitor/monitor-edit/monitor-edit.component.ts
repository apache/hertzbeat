import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TitleService } from '@delon/theme';
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
    private notifySvc: NzNotificationService
  ) {}

  paramDefines!: ParamDefine[];
  params!: Param[];
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
            this.params = message.data.params;
            this.detected = message.data.detected ? message.data.detected : true;
          } else {
            console.warn(message.msg);
            this.notifySvc.error('查询异常，此监控不存在', message.msg);
            return throwError('查询此监控异常');
          }
          return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
        })
      )
      .subscribe(message => {
        if (message.code === 0) {
          this.paramDefines = message.data;
          this.params = [];
          this.paramDefines.forEach(define => {
            let param = this.paramValueMap.get(define.field);
            if (param === undefined) {
              param = new Param();
              param.field = define.field;
              param.type = define.type === 'number' ? 0 : 1;
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
            this.params.push(param);
          });
        } else {
          console.warn(message.msg);
        }
      });
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
    this.monitorSvc.editMonitor(addMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success('修改监控成功', '');
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`);
        } else {
          this.notifySvc.error('修改监控失败', message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error('修改监控失败', error.error.msg);
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
      detected: this.detected,
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
