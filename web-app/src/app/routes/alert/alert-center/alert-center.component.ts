import { Component, OnInit } from '@angular/core';
import {NzTableQueryParams} from "ng-zorro-antd/table";
import {Alert} from "../../../pojo/Alert";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {NzMessageService} from "ng-zorro-antd/message";
import {AlertService} from "../../../service/alert.service";

@Component({
  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styles: [
  ]
})
export class AlertCenterComponent implements OnInit {

  constructor(private notifySvc: NzNotificationService,
              private msg: NzMessageService,
              private alertSvc: AlertService) { }

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  alerts!: Alert[];
  tableLoading: boolean = false;
  checkedAlertIds = new Set<number>();

  ngOnInit(): void {
    this.loadAlertsTable();
  }

  loadAlertsTable() {
    this.tableLoading = true;
    let alertsInit$ = this.alertSvc.getAlerts(this.pageIndex - 1, this.pageSize)
      .subscribe(message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedAlertIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.alerts = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        alertsInit$.unsubscribe();
      }, error => {
        this.tableLoading = false;
        alertsInit$.unsubscribe();
      });
  }

  onRestoreAlerts() {

  }
  onRestoreOneAlert(alertId: number) {

  }
  onDeleteAlerts() {

  }

  onDeleteOneAlert(alertId: number) {

  }

  // begin: 列表多选分页逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.alerts.forEach(monitor => this.checkedAlertIds.add(monitor.id));
    } else {
      this.checkedAlertIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedAlertIds.add(monitorId);
    } else {
      this.checkedAlertIds.delete(monitorId);
    }
  }
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadAlertsTable();
  }
  // end: 列表多选分页逻辑


}
