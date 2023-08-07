import {Component, Inject,Input,OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {I18NService} from '@core';
import {ALAIN_I18N_TOKEN} from '@delon/theme';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {NzNotificationService} from 'ng-zorro-antd/notification';
import {Monitor} from '../../../pojo/Monitor';
import {MonitorService} from '../../../service/monitor.service';
import { ElementRef, Renderer2,ViewChild  } from '@angular/core';


@Component({
  selector: 'app-help-massage-show',
  templateUrl: './help-massage-show.component.html',
  styleUrls: ['./help-massage-show.component.less']
})
export class HelpMassageShowComponent implements OnInit {
  @Input()
  help_massage_content: string = "content";
  @Input()
  guild_link: string = "content";
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private monitorSvc: MonitorService,
    private messageSvc: NzMessageService,
    private rd2: Renderer2,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {
  }
  isCollapsed: boolean = false;
  isLevel2Collapsed: boolean = false;
  @ViewChild('collapsed_content') collapsed_content: any;
  initialHeight: number = 28.8;
  handleButtonClick(): void {
    this.isCollapsed = !this.isCollapsed;
    this.isLevel2Collapsed = !this.isLevel2Collapsed;
    const targetHeight = this.isLevel2Collapsed ? 28.8 : 140;
    this.rd2.setStyle(this.collapsed_content.nativeElement, 'height', `${targetHeight}px`);
  }

  app!: string | undefined;
  tag!: string | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(paramMap => {
      let appStr = paramMap.get('app');
      let tagStr = paramMap.get('tag');
      if (tagStr != null) {
        this.tag = tagStr;
      } else {
        this.tag = undefined;
      }
      if (appStr != null) {
        this.app = appStr;
      } else {
        this.app = undefined;
      }
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
    });
  }
}
