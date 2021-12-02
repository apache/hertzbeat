import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {MonitorService} from "../../../service/monitor.service";
import {Monitor} from "../../../pojo/Monitor";
import {Page} from "../../../pojo/Page";
import {NzModalService} from "ng-zorro-antd/modal";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {NzMessageService} from "ng-zorro-antd/message";

@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styles: [
  ]
})
export class MonitorListComponent implements OnInit {

  constructor(private route: ActivatedRoute,
              private router: Router,
              private modal: NzModalService,
              private notifySvc: NzNotificationService,
              private msg: NzMessageService,
              private monitorSvc: MonitorService) { }

  app!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  pageTotal: number = 0;
  monitors!: Monitor[];
  pageMonitors!: Page<Monitor>;
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();

  ngOnInit(): void {
    this.route.queryParamMap
      .subscribe(paramMap => {
        this.app = paramMap.get("app") || '';
        this.initMonitorTable();
      });
  }

  initMonitorTable() {
    let monitorInit$ = this.monitorSvc.getMonitors(this.app, this.pageIndex - 1, this.pageSize)
      .subscribe(message => {
        this.tableLoading = false;
        if (message.code === 0) {
          this.pageMonitors = message.data;
          this.monitors = this.pageMonitors.content;
          this.pageIndex = this.pageMonitors.number + 1;
          this.pageTotal = this.pageMonitors.totalElements;
        } else {
          console.warn(message.msg);
        }
        monitorInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        monitorInit$.unsubscribe();
      });
  }

  onEditOneMonitor(monitorId: number) {
    if (monitorId == null) {
      this.notifySvc.warning("未选中任何待编辑项！","");
      return;
    }
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
    // 参数样例
    // this.router.navigate(['/monitors/new'],{queryParams: {app: "linux"}});
  }

  onEditMonitor() {
    // 编辑时只能选中一个监控
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning("未选中任何待编辑项！","");
      return;
    }
    if (this.checkedMonitorIds.size > 1) {
      this.notifySvc.warning("只能对一个选中项进行编辑！","");
      return;
    }
    let monitorId = 0;
    this.checkedMonitorIds.forEach(item => monitorId = item);
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
  }

  onDeleteOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: '请确认是否删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteMonitors(monitors)
    });
  }

  onDeleteMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning("未选中任何待删除项！","");
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteMonitors(this.checkedMonitorIds)
    });
  }


  deleteMonitors(monitors: Set<number>) {
    if (monitors == null || monitors.size == 0) {
      this.notifySvc.warning("未选中任何待删除项！","");
      return;
    }
    const deleteMonitors$ = this.monitorSvc.deleteMonitors(monitors)
      .subscribe(message => {
          deleteMonitors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success("删除成功！", "");
          this.initMonitorTable();
        } else {
          this.notifySvc.error("删除失败！", message.msg);
        }
    },
        error => {
          deleteMonitors$.unsubscribe();
          this.notifySvc.error("删除失败！", error.msg)
        }
    );
  }


  // begin: 列表多选逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.monitors.forEach(monitor => this.checkedMonitorIds.add(monitor.id));
    } else {
      this.checkedMonitorIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedMonitorIds.add(monitorId);
    } else {
      this.checkedMonitorIds.delete(monitorId);
    }
  }
  // end: 列表多选逻辑


}
