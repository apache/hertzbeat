import { Component, OnInit } from '@angular/core';
import {NzTableQueryParams} from "ng-zorro-antd/table";
import {Alert} from "../../../pojo/Alert";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {AlertService} from "../../../service/alert.service";
import {NzModalService} from "ng-zorro-antd/modal";

@Component({
  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styles: [
  ]
})
export class AlertCenterComponent implements OnInit {

  constructor(private notifySvc: NzNotificationService,
              private modal: NzModalService,
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

  onDeleteAlerts() {
    if (this.checkedAlertIds == null || this.checkedAlertIds.size === 0) {
      this.notifySvc.warning("未选中任何待删除项！","");
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteAlerts(this.checkedAlertIds)
    });
  }

  onDeleteOneAlert(alertId: number) {
    let alerts = new Set<number>();
    alerts.add(alertId);
    this.modal.confirm({
      nzTitle: '请确认是否删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteAlerts(alerts)
    });
  }

  deleteAlerts(alertIds: Set<number>) {
    this.tableLoading = true;
    const deleteAlerts$ = this.alertSvc.deleteAlerts(alertIds)
      .subscribe(message => {
          deleteAlerts$.unsubscribe();
          if (message.code === 0) {
            this.notifySvc.success("删除成功！", "");
            this.loadAlertsTable();
          } else {
            this.tableLoading = false;
            this.notifySvc.error("删除失败！", message.msg);
          }
        },
        error => {
          this.tableLoading = false;
          deleteAlerts$.unsubscribe();
          this.notifySvc.error("删除失败！", error.msg)
        }
      );
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
