import { Component, OnInit } from '@angular/core';
import {NzTableQueryParams} from "ng-zorro-antd/table";
import {ActivatedRoute, Router} from "@angular/router";
import {NzModalService} from "ng-zorro-antd/modal";
import {NzNotificationService} from "ng-zorro-antd/notification";
import {NzMessageService} from "ng-zorro-antd/message";
import {AlertDefineService} from "../../../service/alert-define.service";
import {AlertDefine} from "../../../pojo/AlertDefine";
import {finalize} from "rxjs/operators";
import {AppDefineService} from "../../../service/app-define.service";

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
              private appDefineSvc: AppDefineService,
              private alertDefineSvc: AlertDefineService) { }

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: AlertDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();

  appHierarchies!: any[];

  ngOnInit(): void {
    this.loadAlertDefineTable();
    // 查询监控层级
    const getHierarchy$ = this.appDefineSvc.getAppHierarchy()
      .pipe(finalize(() => {
        getHierarchy$.unsubscribe();
      }))
      .subscribe(message => {
        if (message.code === 0) {
          this.appHierarchies = message.data;
        } else {
          console.warn(message.msg);
        }
      }, error => {
        console.warn(error.msg);
      })
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
    this.define = new AlertDefine();
    this.isModalAdd = true;
    this.isModalVisible = true;
    this.isModalOkLoading = false;
  }

  onEditOneAlertDefine(alertDefineId: number) {
    if (alertDefineId == null) {
      this.notifySvc.warning("未选中任何待编辑项！","");
      return;
    }
    this.editAlertDefine(alertDefineId);
  }

  onEditAlertDefine() {
    // 编辑时只能选中一个
    if (this.checkedDefineIds == null || this.checkedDefineIds.size === 0) {
      this.notifySvc.warning("未选中任何待编辑项！","");
      return;
    }
    if (this.checkedDefineIds.size > 1) {
      this.notifySvc.warning("只能对一个选中项进行编辑！","");
      return;
    }
    let alertDefineId = 0;
    this.checkedDefineIds.forEach(item => alertDefineId = item);
    this.editAlertDefine(alertDefineId);
  }

  editAlertDefine(alertDefineId: number) {
    this.isModalAdd = false;
    this.isModalVisible = true;
    this.isModalOkLoading = false;
    // 查询告警定义信息
    const getDefine$ = this.alertDefineSvc.getAlertDefine(alertDefineId)
      .pipe(finalize(() => {
        getDefine$.unsubscribe();
      }))
      .subscribe(message => {
        if (message.code === 0) {
          this.define = message.data;
          this.cascadeValues = [this.define.app, this.define.metric, this.define.field];
        } else {
          this.notifySvc.error("查询此监控定义详情失败！",message.msg);
        }
      }, error => {
        this.notifySvc.error("查询此监控定义详情失败！",error.msg);
      })
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

  // begin: 列表多选分页逻辑
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
  /**
   * 分页回调
   * @param params 页码信息
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadAlertDefineTable();
  }
  // end: 列表多选逻辑


  // start 新增修改告警定义model
  isModalVisible = false;
  isModalOkLoading = false;
  isModalAdd = true;
  define!: AlertDefine;
  cascadeValues: string[] = [];
  onModalCancel() {
    this.isModalVisible = false;
  }
  onModalOk() {
    this.isModalOkLoading = true;
    this.define.app = this.cascadeValues[0];
    this.define.metric = this.cascadeValues[1];
    this.define.field = this.cascadeValues[2];
    if (this.isModalAdd) {
      const modalOk$ = this.alertDefineSvc.newAlertDefine(this.define)
        .pipe(finalize(() => {
          modalOk$.unsubscribe();
          this.isModalOkLoading = false;
        }))
        .subscribe(message => {
          if (message.code === 0) {
            this.isModalVisible = false;
            this.notifySvc.success("新增成功！", "");
            this.loadAlertDefineTable();
          } else {
            this.notifySvc.error("新增失败！", message.msg);
          }
        }, error => {
          this.notifySvc.error("新增失败！", error.msg);
        })
    } else {
      const modalOk$ = this.alertDefineSvc.editAlertDefine(this.define)
        .pipe(finalize(() => {
          modalOk$.unsubscribe();
          this.isModalOkLoading = false;
        }))
        .subscribe(message => {
          if (message.code === 0) {
            this.isModalVisible = false;
            this.notifySvc.success("修改成功！", "");
            this.loadAlertDefineTable();
          } else {
            this.notifySvc.error("修改失败！", message.msg);
          }
        }, error => {
          this.notifySvc.error("修改失败！", error.msg);
        })
    }
  }
}
