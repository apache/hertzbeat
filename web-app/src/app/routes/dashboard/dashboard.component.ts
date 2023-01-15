import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { EChartsOption } from 'echarts';
import { NzMessageService } from 'ng-zorro-antd/message';
import { fromEvent } from 'rxjs';

import { Alert } from '../../pojo/Alert';
import { AppCount } from '../../pojo/AppCount';
import { AlertService } from '../../service/alert.service';
import { MonitorService } from '../../service/monitor.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  constructor(
    private msg: NzMessageService,
    private monitorSvc: MonitorService,
    private alertSvc: AlertService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // start 大类别数量信息
  appCountService: AppCount = new AppCount();
  appCountOs: AppCount = new AppCount();
  appCountDb: AppCount = new AppCount();
  appCountMid: AppCount = new AppCount();
  appCountCustom: AppCount = new AppCount();

  // start 数量全局概览
  interval$!: any;
  appsCountLoading: boolean = true;
  appsCountTableData: any[] = [];
  appsCountEChartOption!: EChartsOption;
  appsCountTheme!: EChartsOption;
  appsCountEchartsInstance!: any;
  pageResize$!: any;

  // 告警列表
  alerts!: Alert[];

  ngOnInit(): void {
    this.appsCountTheme = {
      title: {
        text: `{a|${this.i18nSvc.fanyi('dashboard.monitors.title')}}`,
        subtext: `{b|${this.i18nSvc.fanyi('dashboard.monitors.sub-title')}}`,
        left: 'center',
        textStyle: {
          rich: {
            a: {
              fontWeight: 'bolder',
              align: 'center',
              fontSize: 26
            }
          }
        },
        subtextStyle: {
          rich: {
            b: {
              fontWeight: 'normal',
              align: 'center',
              fontSize: 14
            }
          }
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: `{a} <br/>{b} : {c}${this.i18nSvc.fanyi('dashboard.monitors.formatter')}({d}%)`
      },
      legend: {
        show: false,
        itemWidth: 80,
        itemHeight: 20,
        right: 0,
        orient: 'vertical'
      },
      calculable: true,
      series: [
        {
          name: this.i18nSvc.fanyi('dashboard.monitors.total'),
          type: 'pie',
          selectedMode: 'single',
          color: '#722ED1',
          radius: [0, '30%'],
          label: {
            position: 'center',
            fontSize: 26,
            fontWeight: 'bolder',
            color: '#ffffff',
            fontStyle: 'oblique',
            formatter: '{c}'
          },
          labelLine: {
            show: false
          },
          data: [{ value: 0, name: this.i18nSvc.fanyi('dashboard.monitors.total') }]
        },
        {
          name: this.i18nSvc.fanyi('dashboard.monitors.distribute'),
          type: 'pie',
          radius: ['45%', '65%'],
          labelLine: {
            length: 30
          },
          label: {
            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}}   {per|{d}%}  ',
            backgroundColor: '#F6F8FC',
            borderColor: '#8C8D8E',
            borderWidth: 1,
            borderRadius: 4,
            rich: {
              a: {
                color: '#6E7079',
                lineHeight: 22,
                align: 'center'
              },
              hr: {
                borderColor: '#8C8D8E',
                width: '100%',
                borderWidth: 1,
                height: 0
              },
              b: {
                color: '#4C5058',
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 33
              },
              per: {
                color: '#fff',
                backgroundColor: '#4C5058',
                padding: [3, 4],
                borderRadius: 4
              }
            }
          }
        }
      ]
    };
    this.alertsTheme = {
      title: {
        subtext: `{b|${this.i18nSvc.fanyi('dashboard.alerts.distribute')}}`,
        left: 'center',
        subtextStyle: {
          rich: {
            b: {
              fontWeight: 'bold',
              align: 'center',
              fontSize: 14
            }
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: [this.i18nSvc.fanyi('alert.priority.2'), this.i18nSvc.fanyi('alert.priority.1'), this.i18nSvc.fanyi('alert.priority.0')]
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: this.i18nSvc.fanyi('dashboard.alerts.num'),
          type: 'bar',
          data: [
            {
              value: 0,
              // 设置单个柱子的样式
              itemStyle: {
                color: '#ffb72b',
                shadowColor: '#91cc75'
              }
            },
            {
              value: 0,
              itemStyle: {
                color: '#fa6202',
                shadowColor: '#91cc75'
              }
            },
            {
              value: 0,
              itemStyle: {
                color: '#dc1313',
                shadowColor: '#91cc75'
              }
            }
          ]
        }
      ]
    };
    this.alertsDealTheme = {
      title: {
        subtext: `{b|${this.i18nSvc.fanyi('dashboard.alerts.deal')}}`,
        left: 'center',
        subtextStyle: {
          rich: {
            b: {
              fontWeight: 'bold',
              align: 'center',
              fontSize: 14
            }
          }
        }
      },
      tooltip: {
        formatter: '{b} : {c}%'
      },
      series: [
        {
          name: this.i18nSvc.fanyi('dashboard.alerts.deal-percent'),
          type: 'gauge',
          progress: {
            show: true
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}'
          },
          data: [
            {
              value: 100,
              name: this.i18nSvc.fanyi('dashboard.alerts.deal-percent')
            }
          ]
        }
      ]
    };
    this.appsCountLoading = true;
    this.alertsLoading = true;
    this.refresh();
    // https://stackoverflow.com/questions/43908009/why-is-setinterval-in-an-angular-service-only-firing-one-time
    this.interval$ = setInterval(this.refresh.bind(this), 30000);
    this.pageResize$ = fromEvent(window, 'resize').subscribe(event => {
      this.resizeChart();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.interval$);
    if (this.pageResize$) {
      this.pageResize$.unsubscribe();
    }
  }

  refresh(): void {
    this.refreshAppsCount();
    this.refreshAlertContentList();
    this.refreshAlertSummary();
  }
  refreshAppsCount(): void {
    this.appCountService = new AppCount();
    this.appCountOs = new AppCount();
    this.appCountDb = new AppCount();
    this.appCountMid = new AppCount();
    this.appCountCustom = new AppCount();
    let dashboard$ = this.monitorSvc.getAppsMonitorSummary().subscribe(
      message => {
        dashboard$.unsubscribe();
        if (message.code === 0 && message.data.apps != undefined) {
          // {app:'linux',size: 12}
          let apps: AppCount[] = message.data.apps;
          this.appsCountTableData = [];
          let total = 0;
          apps.forEach(app => {
            let appName = this.i18nSvc.fanyi(`monitor.app.${app.app}`);
            this.appsCountTableData.push({
              // 自定义属性
              app: app.app,
              // 默认属性
              name: appName,
              value: app.size
            });
            total = total + (app.size ? app.size : 0);
            switch (app.category) {
              case 'service':
                this.appCountService.size += app.size;
                this.appCountService.availableSize += app.availableSize;
                this.appCountService.unAvailableSize += app.unAvailableSize;
                this.appCountService.unManageSize += app.unManageSize;
                this.appCountService.unReachableSize += app.unReachableSize;
                break;
              case 'db':
                this.appCountDb.size += app.size;
                this.appCountDb.availableSize += app.availableSize;
                this.appCountDb.unAvailableSize += app.unAvailableSize;
                this.appCountDb.unManageSize += app.unManageSize;
                this.appCountDb.unReachableSize += app.unReachableSize;
                break;
              case 'os':
                this.appCountOs.size += app.size;
                this.appCountOs.availableSize += app.availableSize;
                this.appCountOs.unAvailableSize += app.unAvailableSize;
                this.appCountOs.unManageSize += app.unManageSize;
                this.appCountOs.unReachableSize += app.unReachableSize;
                break;
              case 'mid':
                this.appCountMid.size += app.size;
                this.appCountMid.availableSize += app.availableSize;
                this.appCountMid.unAvailableSize += app.unAvailableSize;
                this.appCountMid.unManageSize += app.unManageSize;
                this.appCountMid.unReachableSize += app.unReachableSize;
                break;
              case 'custom':
                this.appCountCustom.size += app.size;
                this.appCountCustom.availableSize += app.availableSize;
                this.appCountCustom.unAvailableSize += app.unAvailableSize;
                this.appCountCustom.unManageSize += app.unManageSize;
                this.appCountCustom.unReachableSize += app.unReachableSize;
                break;
            }
          });
          // @ts-ignore
          this.appsCountTheme.series[0].data = [{ value: total, name: this.i18nSvc.fanyi('dashboard.monitors.total') }];
          // @ts-ignore
          this.appsCountTheme.series[1].data = this.appsCountTableData;
          this.appsCountEChartOption = this.appsCountTheme;
          this.cdr.detectChanges();
        } else {
          this.appsCountEChartOption = this.appsCountTheme;
          this.cdr.detectChanges();
        }
        this.appsCountLoading = false;
      },
      error => {
        console.error(error);
        this.appsCountLoading = false;
        dashboard$.unsubscribe();
      }
    );
  }

  onChartClick(click: any) {
    if (click != undefined) {
      let app = click.data?.app;
      if (app != undefined) {
        this.router.navigate(['/monitors'], { queryParams: { app: app } });
      }
    }
  }

  onAppsCountChartInit(ec: any) {
    this.appsCountEchartsInstance = ec;
  }
  onAlertNumChartInit(ec: any) {
    this.alertsEchartsInstance = ec;
  }
  onAlertRateChartInit(ec: any) {
    this.alertsDealEchartsInstance = ec;
  }
  resizeChart() {
    if (this.appsCountEchartsInstance) {
      this.appsCountEchartsInstance.resize();
    }
    if (this.alertsEchartsInstance) {
      this.alertsEchartsInstance.resize();
    }
    if (this.alertsDealEchartsInstance) {
      this.alertsDealEchartsInstance.resize();
    }
  }

  // start 告警分布
  alertsEChartOption!: EChartsOption;
  alertsTheme!: EChartsOption;
  alertsEchartsInstance!: any;
  alertsLoading: boolean = true;

  refreshAlerts(): void {
    this.alertsEChartOption = this.alertsTheme;
    this.cdr.detectChanges();
    this.alertsLoading = false;
  }

  // start 告警处理率
  alertsDealEChartOption!: EChartsOption;
  alertsDealTheme!: EChartsOption;
  alertsDealEchartsInstance!: any;
  alertsDealLoading: boolean = true;

  refreshAlertContentList(): void {
    let alertsInit$ = this.alertSvc.loadAlerts(undefined, undefined, undefined, 0, 4).subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.alerts = page.content;
          this.cdr.detectChanges();
        } else {
          console.warn(message.msg);
        }
        alertsInit$.unsubscribe();
      },
      error => {
        alertsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  refreshAlertSummary(): void {
    let alertSummaryInit$ = this.alertSvc.getAlertsSummary().subscribe(
      message => {
        if (message.code === 0) {
          let summary = message.data;
          // @ts-ignore
          this.alertsTheme.series[0].data = [
            {
              value: summary.priorityWarningNum,
              itemStyle: {
                color: '#ffb72b',
                shadowColor: '#91cc75'
              }
            },
            {
              value: summary.priorityCriticalNum,
              itemStyle: {
                color: '#fa6202',
                shadowColor: '#91cc75'
              }
            },
            {
              value: summary.priorityEmergencyNum,
              itemStyle: {
                color: '#dc1313',
                shadowColor: '#91cc75'
              }
            }
          ];
          // @ts-ignore
          this.alertsDealTheme.series[0].data = [
            {
              value: summary.rate,
              name: this.i18nSvc.fanyi('dashboard.alerts.deal-percent')
            }
          ];
          this.alertsEChartOption = this.alertsTheme;
          this.alertsDealEChartOption = this.alertsDealTheme;
          this.cdr.detectChanges();
        } else {
          console.warn(message.msg);
        }
        alertSummaryInit$.unsubscribe();
      },
      error => {
        alertSummaryInit$.unsubscribe();
        this.alertsDealLoading = false;
        this.alertsLoading = false;
        console.error(error.msg);
      }
    );
  }
}
