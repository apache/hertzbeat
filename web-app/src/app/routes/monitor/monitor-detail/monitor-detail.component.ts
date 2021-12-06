import { Component, OnInit } from '@angular/core';
import {MonitorService} from "../../../service/monitor.service";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {TitleService} from "@delon/theme";
import {switchMap} from "rxjs/operators";
import {Param} from "../../../pojo/Param";
import {Monitor} from "../../../pojo/Monitor";

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styleUrls: ['./monitor-detail.component.less']
})
export class MonitorDetailComponent implements OnInit {

  constructor(private monitorSvc: MonitorService,
              private route: ActivatedRoute,
              private router: Router,
              private titleSvc: TitleService) { }
  isSpinning: boolean = false
  monitorId!: number;
  app: string | undefined;
  monitor: Monitor | undefined;
  options: any;
  port: number | undefined;
  metrics!: string[];

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.isSpinning = true;
        let id = paramMap.get("monitorId");
        this.monitorId = Number(id);
        // 查询监控指标组结构信息
        return this.monitorSvc.getMonitor(this.monitorId);
      })
    ).subscribe(message => {
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
        })
        this.metrics = message.data.metrics;
      } else {
        console.warn(message.msg);
      }
    }, error => {
      this.isSpinning = false;
    });
  }
}
