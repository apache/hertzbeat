/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { CloudData } from 'angular-tag-cloud-module';
import { EChartsOption } from 'echarts';
import { NzMessageService } from 'ng-zorro-antd/message';
import { fromEvent } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AppCount } from '../../pojo/AppCount';
import { CollectorSummary } from '../../pojo/CollectorSummary';
import { SingleAlert } from '../../pojo/SingleAlert';
import { AlertService } from '../../service/alert.service';
import { CollectorService } from '../../service/collector.service';
import { LabelService } from '../../service/label.service';
import { MonitorService } from '../../service/monitor.service';
import { ThemeService } from '../../service/theme.service';
import { formatLabelName } from '../../shared/utils/common-util';

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
    private labelSvc: LabelService,
    private collectorSvc: CollectorService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private router: Router,
    private themeSvc: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  theme: string = 'default';
  // Tag Word Cloud
  wordCloudData: CloudData[] = [];
  wordCloudDataLoading: boolean = false;
  defaultWordCloudData: CloudData[] = [
    { text: 'HertzBeat', weight: 5 },
    { text: 'Env:Prod', weight: 8 },
    { text: 'Mysql', weight: 7 },
    { text: 'Ping', weight: 5 },
    { text: 'Product', weight: 6 },
    { text: 'Env:Test', weight: 4 },
    { text: 'TanCloud', weight: 3 },
    { text: 'Bigdata', weight: 6 },
    { text: 'Prod', weight: 4 },
    { text: 'Dev', weight: 5 },
    { text: 'Cache', weight: 7 },
    { text: 'Region:US', weight: 7 },
    { text: 'Region:CN', weight: 8 },
    { text: 'Region:UK', weight: 7 },
    { text: 'Localhost', weight: 6 },
    { text: 'Cloud', weight: 8 },
    { text: 'Network', weight: 5 },
    { text: 'Custom', weight: 6 }
  ];

  refreshWordCloudContent(): void {
    this.wordCloudDataLoading = true;
    let tagsInit$ = this.labelSvc
      .loadLabels(undefined, 1, 0, 10000)
      .pipe(finalize(() => (this.wordCloudDataLoading = false)))
      .subscribe(
        message => {
          if (message.code === 0) {
            let page = message.data;
            let tags = page.content;
            if (tags != null && tags.length != 0) {
              let tmpData: CloudData[] = [];
              tags.forEach(item => {
                tmpData.push({
                  text: formatLabelName(item),
                  weight: Math.random() * (10 - 5) + 5
                });
              });
              this.wordCloudData = tmpData;
            } else {
              this.wordCloudData = this.defaultWordCloudData;
            }
            this.cdr.detectChanges();
          } else {
            console.warn(message.msg);
          }
          tagsInit$.unsubscribe();
        },
        error => {
          tagsInit$.unsubscribe();
          console.error(error.msg);
        }
      );
  }

  onLabelCloudClick(data: CloudData): void {
    this.router.navigate(['/monitors'], { queryParams: { labels: data.text } });
  }

  // start -- quantitative information summary
  appCountService: AppCount = new AppCount();
  appCountOs: AppCount = new AppCount();
  appCountDb: AppCount = new AppCount();
  appCountMid: AppCount = new AppCount();
  appCountCustom: AppCount = new AppCount();
  appCountProgram: AppCount = new AppCount();
  appCountCache: AppCount = new AppCount();
  appCountBigdata: AppCount = new AppCount();
  appCountWebserver: AppCount = new AppCount();
  appCountCn: AppCount = new AppCount();
  appCountNetwork: AppCount = new AppCount();

  slideConfig = {
    infinite: true,
    speed: 1200,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 1200,
    rows: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2.75,
          slidesToScroll: 3,
          speed: 4000,
          infinite: true
        }
      },
      {
        breakpoint: 480,
        settings: {
          speed: 4000,
          slidesToShow: 0.75,
          slidesToScroll: 1
        }
      }
    ]
  };

  // start -- quantity overall overview
  interval$!: any;
  appsCountLoading: boolean = true;
  appsCountTableData: any[] = [];
  appsCountEChartOption!: EChartsOption;
  appsCountTheme!: EChartsOption;
  appsCountEchartsInstance!: any;
  pageResize$!: any;

  // collector list
  collectorsLoading: boolean = false;
  collectors!: CollectorSummary[];
  collectorsTabSelectedIndex = 0;

  // alert list
  alerts!: SingleAlert[];
  alertContentLoading: boolean = false;

  ngOnInit(): void {
    this.theme = this.themeSvc.getTheme() || 'default';
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
          color: '#3f51b5',
          radius: [0, '30%'],
          label: {
            position: 'center',
            fontSize: 38,
            fontWeight: 'bolder',
            color: '#ffffff',
            fontStyle: 'normal',
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
        data: [this.i18nSvc.fanyi('alert.severity.2'), this.i18nSvc.fanyi('alert.severity.1'), this.i18nSvc.fanyi('alert.severity.0')]
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
              // Set the style of the individual columns
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
    this.interval$ = setInterval(this.refresh.bind(this), 80000);
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
    this.refreshWordCloudContent();
    this.refreshAppsCount();
    this.refreshAlertContentList();
    this.refreshCollectorContentList();
    this.refreshAlertSummary();
  }
  refreshAppsCount(): void {
    let appCountService: AppCount = new AppCount();
    let appCountOs: AppCount = new AppCount();
    let appCountDb: AppCount = new AppCount();
    let appCountMid: AppCount = new AppCount();
    let appCountCustom: AppCount = new AppCount();
    let appCountProgram: AppCount = new AppCount();
    let appCountCache: AppCount = new AppCount();
    let appCountWebserver: AppCount = new AppCount();
    let appCountBigdata: AppCount = new AppCount();
    let appCountCn: AppCount = new AppCount();
    let appCountNetwork: AppCount = new AppCount();
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
              // custom attribute
              app: app.app,
              // default attribute
              name: appName,
              value: app.size
            });
            total = total + (app.size ? app.size : 0);
            switch (app.category) {
              case 'service':
                appCountService.size += app.size;
                appCountService.availableSize += app.availableSize;
                appCountService.unAvailableSize += app.unAvailableSize;
                appCountService.unManageSize += app.unManageSize;
                break;
              case 'db':
                appCountDb.size += app.size;
                appCountDb.availableSize += app.availableSize;
                appCountDb.unAvailableSize += app.unAvailableSize;
                appCountDb.unManageSize += app.unManageSize;
                break;
              case 'os':
                appCountOs.size += app.size;
                appCountOs.availableSize += app.availableSize;
                appCountOs.unAvailableSize += app.unAvailableSize;
                appCountOs.unManageSize += app.unManageSize;
                break;
              case 'mid':
                appCountMid.size += app.size;
                appCountMid.availableSize += app.availableSize;
                appCountMid.unAvailableSize += app.unAvailableSize;
                appCountMid.unManageSize += app.unManageSize;
                break;
              case 'custom':
                appCountCustom.size += app.size;
                appCountCustom.availableSize += app.availableSize;
                appCountCustom.unAvailableSize += app.unAvailableSize;
                appCountCustom.unManageSize += app.unManageSize;
                break;
              case 'program':
                appCountProgram.size += app.size;
                appCountProgram.availableSize += app.availableSize;
                appCountProgram.unAvailableSize += app.unAvailableSize;
                appCountProgram.unManageSize += app.unManageSize;
                break;
              case 'bigdata':
                appCountBigdata.size += app.size;
                appCountBigdata.availableSize += app.availableSize;
                appCountBigdata.unAvailableSize += app.unAvailableSize;
                appCountBigdata.unManageSize += app.unManageSize;
                break;
              case 'webserver':
                appCountWebserver.size += app.size;
                appCountWebserver.availableSize += app.availableSize;
                appCountWebserver.unAvailableSize += app.unAvailableSize;
                appCountWebserver.unManageSize += app.unManageSize;
                break;
              case 'cache':
                appCountCache.size += app.size;
                appCountCache.availableSize += app.availableSize;
                appCountCache.unAvailableSize += app.unAvailableSize;
                appCountCache.unManageSize += app.unManageSize;
                break;
              case 'cn':
                appCountCn.size += app.size;
                appCountCn.availableSize += app.availableSize;
                appCountCn.unAvailableSize += app.unAvailableSize;
                appCountCn.unManageSize += app.unManageSize;
                break;
              case 'network':
                appCountNetwork.size += app.size;
                appCountNetwork.availableSize += app.availableSize;
                appCountNetwork.unAvailableSize += app.unAvailableSize;
                appCountNetwork.unManageSize += app.unManageSize;
                break;
            }
          });
          this.appCountService = appCountService;
          this.appCountOs = appCountOs;
          this.appCountDb = appCountDb;
          this.appCountMid = appCountMid;
          this.appCountCustom = appCountCustom;
          this.appCountBigdata = appCountBigdata;
          this.appCountCache = appCountCache;
          this.appCountProgram = appCountProgram;
          this.appCountWebserver = appCountWebserver;
          this.appCountNetwork = appCountNetwork;
          this.appCountCn = appCountCn;
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

  // start -- alarm distribution
  alertsEChartOption!: EChartsOption;
  alertsTheme!: EChartsOption;
  alertsEchartsInstance!: any;
  alertsLoading: boolean = true;

  // start -- alarm processing rate
  alertsDealEChartOption!: EChartsOption;
  alertsDealTheme!: EChartsOption;
  alertsDealEchartsInstance!: any;
  alertsDealLoading: boolean = true;

  refreshAlertContentList(): void {
    this.alertContentLoading = true;
    let alertsInit$ = this.alertSvc
      .loadAlerts('firing', undefined, 0, 10)
      .pipe(finalize(() => (this.alertContentLoading = false)))
      .subscribe(
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

  refreshCollectorContentList(): void {
    this.collectorsLoading = true;
    let collectorInit$ = this.collectorSvc
      .getCollectors()
      .pipe(finalize(() => (this.collectorsLoading = false)))
      .subscribe(
        message => {
          if (message.code === 0) {
            this.collectors = message.data.content;
            this.cdr.detectChanges();
          } else {
            console.warn(message.msg);
          }
          collectorInit$.unsubscribe();
        },
        error => {
          collectorInit$.unsubscribe();
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
        this.alertsLoading = false;
        this.alertsDealLoading = false;
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
