import {Component, Input, OnInit} from '@angular/core';
import {MonitorService} from "../../../service/monitor.service";

@Component({
  selector: 'app-monitor-data-chart',
  templateUrl: './monitor-data-chart.component.html',
  styleUrls: ['./monitor-data-chart.component.less']
})
export class MonitorDataChartComponent implements OnInit {

  @Input()
  get monitorId(): number { return this._monitorId; }
  set monitorId(monitorId: number) {
    this._monitorId = monitorId;
    this.loadData();
  }
  private _monitorId!: number;
  @Input()
  metric!: string;

  time!: any;
  fields!: any[];
  valueRows!: any[];
  rowValues!: any[];
  isTable: boolean = true;

  constructor(private monitorSvc: MonitorService) { }
  ngOnInit(): void {}

  loadData() {
    // 读取实时指标数据
    let metricData$ = this.monitorSvc.getMonitorMetricData(this.monitorId, this.metric)
      .subscribe(message => {
        metricData$.unsubscribe();
        if (message.code === 0) {
          this.time = message.data.time;
          this.fields = message.data.fields;
          this.valueRows = message.data.valueRows;
          if (this.valueRows.length == 1) {
            this.isTable = false;
            this.rowValues = this.valueRows[0].values;
          }
        } else {
          console.error(message.msg);
        }
      }, error => {
        metricData$.unsubscribe();
      })
  }

}
