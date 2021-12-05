import { Component, OnInit } from '@angular/core';
import {MonitorService} from "../../../service/monitor.service";
import {ActivatedRoute, ParamMap, Router} from "@angular/router";
import {TitleService} from "@delon/theme";
import {switchMap} from "rxjs/operators";
import {Message} from "../../../pojo/Message";
import {Param} from "../../../pojo/Param";
import {throwError} from "rxjs";

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styles: [
  ]
})
export class MonitorDetailComponent implements OnInit {

  constructor(private monitorSvc: MonitorService,
              private route: ActivatedRoute,
              private router: Router,
              private titleSvc: TitleService) { }
  isSpinning: boolean = false
  monitorId!: number;
  app: string | undefined;

  options: any;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((paramMap: ParamMap) => {
        this.isSpinning = false;
        let id = paramMap.get("monitorId");
        this.monitorId = Number(id);
        // 查询监控指标组结构信息
        return this.monitorSvc.getMonitor(this.monitorId);
      })
    ).subscribe(message => {
      if (message.code === 0) {

      } else {
        console.warn(message.msg);
      }
    });


    const xAxisData = [];
    const data1 = [];
    const data2 = [];

    for (let i = 0; i < 10; i++) {
      xAxisData.push('category' + i);
      data1.push((Math.sin(i / 5) * (i / 5 - 10) + i / 6) * 5);
      data2.push((Math.cos(i / 5) * (i / 5 - 10) + i / 6) * 5);
    }

    this.options = {
      legend: {
        data: ['bar', 'bar2'],
        align: 'left',
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        silent: false,
        splitLine: {
          show: false,
        },
      },
      yAxis: {},
      series: [
        {
          name: 'bar',
          type: 'bar',
          data: data1,
          animationDelay: (idx: number) => idx * 10,
        },
        {
          name: 'bar2',
          type: 'bar',
          data: data2,
          animationDelay: (idx: number) => idx * 10 + 100,
        },
      ],
      animationEasing: 'elasticOut',
      animationDelayUpdate: (idx: number) => idx * 5,
    };
  }
}
