import { Component, OnInit } from '@angular/core';
import {ParamDefine} from "../../../pojo/ParamDefine";
import {AppDefineService} from "../../../service/app-define.service";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {switchMap} from "rxjs/operators";
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {I18NService} from "@core";
import {Param} from "../../../pojo/Param";
import {Monitor} from "../../../pojo/Monitor";
import {MonitorService} from "../../../service/monitor.service";
import {NzNotificationService} from "ng-zorro-antd/notification";

@Component({
  selector: 'app-monitor-add',
  templateUrl: './monitor-new.component.html',
  styles: [
  ]
})
export class MonitorNewComponent implements OnInit {

  paramDefines!: ParamDefine[];
  params!: Param[];
  monitor!: Monitor;
  profileForm: FormGroup = new FormGroup({});
  detected: boolean = true;
  passwordVisible: boolean = false;
  isSpinning:boolean = false
  constructor(private appDefineSvc: AppDefineService,
              private monitorSvc: MonitorService,
              private route: ActivatedRoute,
              private router: Router,
              private notifySvc: NzNotificationService,
              private i18n: I18NService,
              private formBuilder: FormBuilder) {
    this.monitor = new Monitor();
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.monitor.app = paramMap.get("app") || '';
        this.detected = true;
        this.passwordVisible = false;
        this.isSpinning = false;
        return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
      })
    ).subscribe(message => {
      if (message.code === 0) {
        this.paramDefines = message.data;
        this.params = [];
        this.paramDefines.forEach(define => {
          let param = new Param();
          param.field = define.field;
          param.type = define.type === "number" ? 0 : 1;
          if (define.type === "boolean") {
            param.value = false;
          }
          if (define.defaultValue != undefined) {
            if (define.type === "number") {
              param.value = Number(define.defaultValue);
            } else if (define.type === "boolean") {
              param.value = define.defaultValue.toLowerCase() == 'true'
            } else {
              param.value = define.defaultValue;
            }
          }
          this.params.push(param);
        })
      } else {
        console.warn(message.msg);
      }
    });
  }

  onSubmit() {
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === "host") {
        param.value = this.monitor.host;
      }
    });
    let addMonitor = {
      "detected": this.detected,
      "monitor": this.monitor,
      "params": this.params
    };
    this.isSpinning = true;
    this.monitorSvc.newMonitor(addMonitor)
      .subscribe(message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success("新增监控成功", "");
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`)
        } else {
          this.notifySvc.error("新增监控失败", message.msg);
        }},
        error => {
          this.isSpinning = false;
          this.notifySvc.error("新增监控失败", error.error.msg);
        }
      )
  }

  onDetect() {
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === "host") {
        param.value = this.monitor.host;
      }
    });
    let detectMonitor = {
      "detected": this.detected,
      "monitor": this.monitor,
      "params": this.params
    };
    this.isSpinning = true;
    this.monitorSvc.detectMonitor(detectMonitor)
      .subscribe(message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success("探测成功", "");
        } else {
          this.notifySvc.error("探测失败", message.msg);
        }
      }, error => {
        this.isSpinning = false;
        this.notifySvc.error("探测异常", error.error.msg);
        }
      )
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`)
  }

}
