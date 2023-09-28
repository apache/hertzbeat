import { DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { ObjectStore, ObjectStoreType, ObsConfig } from '../../../../pojo/ObjectStore';
import { GeneralConfigService } from '../../../../service/general-config.service';

const key = 'oss';

@Component({
  selector: 'app-object-store',
  templateUrl: './object-store.component.html',
  styleUrls: ['./object-store.component.less']
})
export class ObjectStoreComponent implements OnInit {
  constructor(
    private cdr: ChangeDetectorRef,
    private notifySvc: NzNotificationService,
    private configService: GeneralConfigService,
    @Inject(DOCUMENT) private doc: any
  ) {}

  loading = true;
  config!: ObjectStore<any>;
  isObjectStoreModalVisible: boolean = false;

  ngOnInit(): void {
    this.loadObjectStore();
  }

  onConfigObjectStore() {
    this.isObjectStoreModalVisible = true;
  }

  onCancelObjectStore() {
    this.isObjectStoreModalVisible = false;
  }

  loadObjectStore() {
    this.loading = true;
    let configInit$ = this.configService.getGeneralConfig(key).subscribe(
      message => {
        if (message.code === 0) {
          if (message.data) {
            this.config = message.data;
          } else {
            this.config = new ObjectStore();
          }
        } else {
          console.warn(message.msg);
        }
        this.loading = false;
        configInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.loading = false;
        configInit$.unsubscribe();
      }
    );
  }

  onSaveObjectStore() {
    this.loading = true;
    const configOk$ = this.configService
      .saveGeneralConfig(this.config, key)
      .pipe(
        finalize(() => {
          configOk$.unsubscribe();
          this.loading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
          } else {
            // this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          // this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }

  onChange = () => {
    console.log(this.config);
    switch (this.config.type) {
      case ObjectStoreType.FILE:
        this.config.config = {};
        break;
      case ObjectStoreType.OBS:
        this.config.config = new ObsConfig();
        break;
    }
  };

  protected readonly ObjectStore = ObjectStore;
  protected readonly ObjectStoreType = ObjectStoreType;
}
