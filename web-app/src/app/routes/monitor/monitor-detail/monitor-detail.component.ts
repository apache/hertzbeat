import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { throwError } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styleUrls: ['./monitor-detail.component.less']
})
export class MonitorDetailComponent implements OnInit, OnDestroy {
  constructor(
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}
  isSpinning: boolean = false;
  monitorId!: number;
  app!: string;
  monitor: Monitor = new Monitor();
  options: any;
  port: number | undefined;
  metrics!: string[];
  chartMetrics: any[] = [];
  deadline = 30;
  countDownTime: number = 0;
  interval$!: any;
  whichTabIndex = 0;
  showBasic = true;

  ngOnInit(): void {
    this.loadRealTimeMetric();
    this.countDownTime = this.deadline;
    this.interval$ = setInterval(this.countDown.bind(this), 1000);
  }

  loadMetricChart() {
    this.isSpinning = true;
    this.showBasic = false;
    this.whichTabIndex = 1;
    // 检测历史数据服务是否可用
    const detectStatus$ = this.monitorSvc
      .getWarehouseStorageServerStatus()
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code == 0) {
            // 查询过滤出此监控下可计算聚合的数字指标
            return this.appDefineSvc.getAppDefine(this.app);
          } else {
            // 不提供历史图表服务
            return throwError(message.msg);
          }
        })
      )
      .pipe(
        finalize(() => {
          detectStatus$.unsubscribe();
          this.isSpinning = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data != undefined) {
            this.chartMetrics = [];
            let metrics = message.data.metrics;
            metrics.forEach((metric: { name: any; fields: any; visible: boolean }) => {
              let fields = metric.fields;
              if (fields != undefined && metric.visible) {
                fields.forEach((field: { type: number; field: any; unit: any }) => {
                  if (field.type == 0) {
                    this.chartMetrics.push({
                      metrics: metric.name,
                      metric: field.field,
                      unit: field.unit
                    });
                    this.cdr.detectChanges();
                  }
                });
              }
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitors.detail.time-series.unavailable'), error);
        }
      );
  }

  loadRealTimeMetric() {
    this.whichTabIndex = 0;
    this.isSpinning = true;
    this.route.paramMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.isSpinning = true;
          let id = paramMap.get('monitorId');
          this.monitorId = Number(id);
          // 查询监控指标组结构信息
          return this.monitorSvc.getMonitor(this.monitorId);
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.monitor = message.data.monitor;
            this.app = this.monitor?.app;
            let params: Param[] = message.data.params;
            // 取出端口信息
            params.forEach(param => {
              if (param.field === 'port') {
                this.port = Number(param.value);
              }
            });
            this.metrics = [];
            this.cdr.detectChanges();
            this.metrics = message.data.metrics;
            this.cdr.detectChanges();
          } else {
            console.warn(message.msg);
          }
          this.isSpinning = false;
        },
        error => {
          this.isSpinning = false;
          console.error(error.msg);
        }
      );
  }

  showBasicStatus(show: boolean) {
    this.showBasic = show;
  }

  countDown() {
    if (this.deadline > 0) {
      this.countDownTime = Math.max(0, this.countDownTime - 1);
      this.cdr.detectChanges();
      if (this.countDownTime == 0) {
        if (this.whichTabIndex == 1) {
          this.loadMetricChart();
        } else {
          this.loadRealTimeMetric();
        }
        this.countDownTime = this.deadline;
        this.cdr.detectChanges();
      }
    }
  }

  refreshMetrics() {
    if (this.whichTabIndex == 1) {
      this.loadMetricChart();
    } else {
      this.loadRealTimeMetric();
    }
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  configRefreshDeadline(deadlineTime: number) {
    this.deadline = deadlineTime;
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    clearInterval(this.interval$);
  }
}
