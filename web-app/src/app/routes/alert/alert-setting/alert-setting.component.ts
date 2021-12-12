import { Component, OnInit } from '@angular/core';
import {NzTableQueryParams} from "ng-zorro-antd/table";
import {ActivatedRoute, Router} from "@angular/router";
import {NzModalService} from "ng-zorro-antd/modal";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {NzMessageService} from "ng-zorro-antd/message";
import {AlertDefineService} from "../../../service/alert-define.service";
import {AlertDefine} from "../../../pojo/AlertDefine";

@Component({
  selector: 'app-alert-setting',
  templateUrl: './alert-setting.component.html',
  styles: [
  ]
})
export class AlertSettingComponent implements OnInit {

  constructor(private route: ActivatedRoute,
              private router: Router,
              private modal: NzModalService,
              private notifySvc: NzNotificationService,
              private msg: NzMessageService,
              private alertDefineSvc: AlertDefineService) { }

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: AlertDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();

  ngOnInit(): void {
    this.loadAlertDefineTable();
  }

  loadAlertDefineTable() {
    this.tableLoading = true;
    let alertDefineInit$ = this.alertDefineSvc.getAlertDefines(this.pageIndex - 1, this.pageSize)
      .subscribe(message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedDefineIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.defines = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        alertDefineInit$.unsubscribe();
      }, error => {
        this.tableLoading = false;
        alertDefineInit$.unsubscribe();
      });
  }

  onNewAlertDefine() {

  }

  onEditAlertDefine() {

  }

  onDeleteAlertDefines() {
    if (this.checkedDefineIds == null || this.checkedDefineIds.size === 0) {
      this.notifySvc.warning("未选中任何待删除项！","");
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteAlertDefines(this.checkedDefineIds)
    });
  }

  onDeleteOneAlertDefine(alertDefineId: number) {
    let defineIds = new Set<number>();
    defineIds.add(alertDefineId);
    this.modal.confirm({
      nzTitle: '请确认是否删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: "primary",
      nzOnOk: () => this.deleteAlertDefines(defineIds)
    });
  }

  onEditOneAlertDefine(alertDefineId: number) {

  }


  deleteAlertDefines(defineIds: Set<number>) {
    if (defineIds == null || defineIds.size == 0) {
      this.notifySvc.warning("未选中任何待删除项！","");
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertDefineSvc.deleteAlertDefines(defineIds)
      .subscribe(message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success("删除成功！", "");
          this.loadAlertDefineTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error("删除失败！", message.msg);
        }
      }, error => {
        this.tableLoading = false;
        deleteDefines$.unsubscribe();
        this.notifySvc.error("删除失败！", error.msg)
      })
  }

  // begin: 列表多选逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.defines.forEach(monitor => this.checkedDefineIds.add(monitor.id));
    } else {
      this.checkedDefineIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedDefineIds.add(monitorId);
    } else {
      this.checkedDefineIds.delete(monitorId);
    }
  }
  // end: 列表多选逻辑

  /**
   * 分页回调
   * @param params 页码信息
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    // this.loadMonitorTable();
  }
}
