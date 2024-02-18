import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs';

import { Message } from '../../pojo/Message';
import { StatusPageComponentStatus } from '../../pojo/StatusPageComponentStatus';
import { StatusPageHistory } from '../../pojo/StatusPageHistory';
import { StatusPageIncident } from '../../pojo/StatusPageIncident';
import { StatusPageIncidentContent } from '../../pojo/StatusPageIncidentContent';
import { StatusPageOrg } from '../../pojo/StatusPageOrg';
import { StatusPagePublicService } from '../../service/status-page-public.service';

@Component({
  selector: 'app-status-public',
  templateUrl: './status-public.component.html',
  styleUrls: ['./status-public.component.less']
})
export class StatusPublicComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private titleService: TitleService,
    private statusPagePublicService: StatusPagePublicService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  statusOrg: StatusPageOrg = new StatusPageOrg();
  componentStatus!: StatusPageComponentStatus[];
  incidentStatus!: StatusPageIncident[];
  loading: boolean = false;
  incidentLoading: boolean = false;
  // component or incident
  showMode: string = 'component';

  ngOnInit(): void {
    this.loadStatusPageOrg();
  }

  loadStatusPageOrg() {
    this.loading = true;
    let loadInit$ = this.statusPagePublicService
      .getStatusPageOrg()
      .pipe(
        switchMap((message: Message<StatusPageOrg>) => {
          if (message.code === 0) {
            this.statusOrg = message.data;
            this.titleService.setTitle(`${this.statusOrg.name} ${this.i18nSvc.fanyi('menu.extras.status')}`);
          } else {
            this.statusOrg = new StatusPageOrg();
            console.log(message.msg);
            this.notifySvc.error(message.msg, '');
            throw new Error(message.msg);
          }
          return this.statusPagePublicService.getStatusPageComponents();
        })
      )
      .subscribe(
        (message: Message<StatusPageComponentStatus[]>) => {
          if (message.code !== 0) {
            this.notifySvc.error(message.msg, '');
          } else {
            this.componentStatus = message.data;
          }
          this.loading = false;
          loadInit$.unsubscribe();
        },
        error => {
          this.loading = false;
          this.notifySvc.error(error.msg, '');
          loadInit$.unsubscribe();
        }
      );
  }

  showIncident() {
    this.showMode = 'incident';
    this.loadStatusPageIncident();
  }

  showComponent() {
    this.showMode = 'component';
    this.loadStatusPageOrg();
  }

  loadStatusPageIncident() {
    this.incidentLoading = true;
    this.statusPagePublicService.getStatusPageIncidents().subscribe(
      (message: Message<StatusPageIncident[]>) => {
        if (message.code !== 0) {
          this.notifySvc.error(message.msg, '');
        } else {
          this.incidentStatus = message.data;
        }
        this.incidentLoading = false;
      },
      error => {
        this.notifySvc.error(error.msg, '');
        this.incidentLoading = false;
      }
    );
  }

  calculateHistoryBlockRgb(history: StatusPageHistory): string {
    if (history.state == 0) {
      return 'green';
    } else if (history.state == 2) {
      return 'rgb(200 200 200)';
    } else {
      return `rgb(255, ${(history.uptime * 300).toFixed(0)}, 0)`;
    }
  }

  getLatestIncidentContentMsg(incidents: StatusPageIncidentContent[]): string {
    if (incidents == undefined || incidents.length == 0) {
      return '';
    }
    let latestContent: StatusPageIncidentContent = incidents[0];
    incidents.forEach(item => {
      if (item.timestamp > latestContent.timestamp) {
        latestContent = item;
      }
    });
    return latestContent.message;
  }

  getProcessTimeStr(startTime: number, endTime: number): string {
    if (startTime == undefined || endTime == undefined) {
      return '0s';
    }
    const diffSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    let processTime = '';
    if (days > 0) {
      processTime = `${days} day${days > 1 ? 's' : ''} `;
    } else if (hours > 0) {
      processTime += `${hours} hour${hours > 1 ? 's' : ''} `;
    } else if (minutes > 0) {
      processTime += `${minutes} minute${minutes > 1 ? 's' : ''} `;
    } else {
      return 'few seconds';
    }
    return processTime;
  }

  protected readonly Array = Array;
}
