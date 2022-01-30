import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';

import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styleUrls: ['./monitor-detail.component.less']
})
export class MonitorDetailComponent implements OnInit {
  constructor(private monitorSvc: MonitorService, private route: ActivatedRoute, private appDefineSvc: AppDefineService) {}
  isSpinning: boolean = false;
  monitorId!: number;
  app!: string;
  monitor!: Monitor;
  options: any;
  port: number | undefined;
  metrics!: string[];
  chartMetrics: any[] = [];

  ngOnInit(): void {
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
          this.isSpinning = false;
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
            this.metrics = message.data.metrics;
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          this.isSpinning = false;
          console.error(error.msg);
        }
      );
  }

  initMetricChart() {
    // 查询过滤出此监控下可计算聚合的数字指标
    const define$ = this.appDefineSvc
      .getAppDefine(this.app)
      .pipe(
        finalize(() => {
          define$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data != undefined) {
            this.chartMetrics = [];
            let metrics = message.data.metrics;
            metrics.forEach((metric: { name: any; fields: any }) => {
              let fields = metric.fields;
              if (fields != undefined) {
                fields.forEach((field: { type: number; field: any; unit: any }) => {
                  if (field.type == 0) {
                    this.chartMetrics.push({
                      metrics: metric.name,
                      metric: field.field,
                      unit: field.unit
                    });
                  }
                });
              }
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.error(error.msg);
        }
      );
  }
}
