/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { EChartsOption } from 'echarts';
import { InViewportAction } from 'ng-in-viewport';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { MonitorService } from '../../../service/monitor.service';
import { createWorker, WorkerResult } from './monitor-data-chart.worker';

@Component({
  selector: 'app-monitor-data-chart',
  templateUrl: './monitor-data-chart.component.html',
  styles: []
})
export class MonitorDataChartComponent implements OnInit, OnDestroy {
  @Input()
  get monitorId(): number {
    return this._monitorId;
  }

  set monitorId(monitorId: number) {
    this._monitorId = monitorId;
  }

  private _monitorId!: number;
  @Input()
  instance!: string;
  @Input()
  app!: string;
  @Input()
  metrics!: string;
  @Input()
  metric!: string;
  @Input()
  unit!: string;
  eChartOption!: EChartsOption;
  lineHistoryTheme!: EChartsOption;
  loading: string | null = null;
  echartsInstance!: any;
  // Default historical data period is last 1 hour
  timePeriod: string = '1h';
  isInViewport = false;
  private debounceTimer: any = undefined;
  private worker$: any = null;

  constructor(
    private monitorSvc: MonitorService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  handleViewportAction(event: InViewportAction) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const wasVisible = this.isInViewport;
      const curVisible = event.visible;
      if (curVisible && !wasVisible) {
        this.isInViewport = curVisible;
        this.loadData();
      }
    }, 200);
  }

  ngOnInit(): void {
    let metricsI18n = this.i18nSvc.fanyi(`monitor.app.${this.app}.metrics.${this.metrics}`);
    let metricI18n = this.i18nSvc.fanyi(`monitor.app.${this.app}.metrics.${this.metrics}.metric.${this.metric}`);
    let title = `${metricsI18n == `monitor.app.${this.app}.metrics.${this.metrics}` ? this.metrics : metricsI18n}/${
      metricI18n == `monitor.app.${this.app}.metrics.${this.metrics}.metric.${this.metric}` ? this.metric : metricI18n
    }`;
    this.lineHistoryTheme = {
      title: {
        text: title,
        textStyle: {
          fontSize: 16,
          fontFamily: 'monospace',
          textShadowOffsetX: 10
        }
      },
      toolbox: {
        show: true,
        orient: 'vertical',
        feature: {
          saveAsImage: {
            title: this.i18nSvc.fanyi('monitor.detail.chart.save'),
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            }
          },
          myPeriod1h: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-1h'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('1h');
            }
          },
          myPeriod6h: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-6h'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('6h');
            }
          },
          myPeriod1d: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-1d'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('1D');
            }
          },
          myPeriod1w: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-1w'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('1W', true);
            }
          },
          myPeriod4w: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-1m'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('4W', true);
            }
          },
          myPeriod3m: {
            show: true,
            title: this.i18nSvc.fanyi('monitor.detail.chart.query-3m'),
            icon: 'path://M827.871087 196.128913C743.498468 111.756293 631.321596 65.290005 512 65.290005c-119.319549 0-231.499491 46.465265-315.871087 130.837884S65.290005 392.680451 65.290005 512s46.465265 231.499491 130.837884 315.871087 196.551538 130.837884 315.871087 130.837884c119.321596 0 231.499491-46.465265 315.871087-130.837884S958.708971 631.319549 958.708971 512 912.243707 280.500509 827.871087 196.128913zM531.556405 917.246651l0-74.145697c0-11.31572-9.174963-20.491707-20.491707-20.491707-11.316743 0-20.491707 9.174963-20.491707 20.491707l0 74.059739C283.276738 906.322857 116.693746 739.164766 106.755396 531.634176l72.351841 0c11.31572 0 20.491707-9.174963 20.491707-20.491707 0-11.31572-9.174963-20.491707-20.491707-20.491707l-72.273047 0c10.769274-206.737528 177.01253-373.005342 383.740848-383.813502l0 72.346725c0 11.316743 9.174963 20.491707 20.491707 20.491707 11.31572 0 20.491707-9.17394 20.491707-20.491707L531.558451 106.752326c207.593012 9.901511 374.807385 176.539762 385.609405 383.89946l-74.142627 0c-11.316743 0-20.491707 9.174963-20.491707 20.491707 0 11.316743 9.174963 20.491707 20.491707 20.491707l74.220399 0C907.275555 739.78796 739.720422 907.317511 531.556405 917.246651z;M532.098757 503.118726 532.098757 258.240529c0-11.316743-9.174963-20.491707-20.491707-20.491707-11.31572 0-20.491707 9.17394-20.491707 20.491707l0 254.66612c0 7.858992 4.429893 14.677281 10.924817 18.114566L693.447539 722.42757c4.002151 4.000104 9.245572 6.001691 14.490016 6.001691s10.487865-2.001587 14.490016-6.001691c8.002254-8.002254 8.002254-20.977777 0-28.980032L532.098757 503.118726z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData('12W', true);
            }
          },
          myRefresh: {
            show: true,
            title: this.i18nSvc.fanyi('common.refresh'),
            icon: 'path://M663.881 339.763l274.021-0.742 0.058-13.271 0.699 0c-0.204-0.48-0.495-0.945-0.699-1.426L938.658 65l-23.776 0.044L914.3 280.41C835.9 151.374 694.321 65 532.342 65c-246.869 0-447 200.132-447 447 0 246.84 200.131 447 447 447 180.343 0 335.657-106.919 406.316-260.75l-33.176 0C836.948 835.027 695.456 929.2 532.342 929.2c-230.048 0-417.2-187.152-417.2-417.2s187.152-417.2 417.2-417.2c158.895 0 297.068 89.487 367.466 220.547l-235.868 0.64L663.881 339.763z',
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            },
            onclick: () => {
              this.loadData();
            }
          }
        }
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '2',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: false
        },
        axisTick: {
          show: true
        },
        axisLine: {
          onZero: false
        }
      },
      yAxis: {
        type: 'value',
        boundaryGap: [0, '100%'],
        splitLine: {
          show: true
        }
      },
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: 100
        },
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: false,
          moveOnMouseMove: false,
          moveOnMouseWheel: false
        }
      ]
    };
    if (this.unit != undefined || this.unit != null) {
      // @ts-ignore
      this.lineHistoryTheme.title.subtext = `${this.i18nSvc.fanyi('monitor.detail.chart.unit')}  ${this.unit}`;
    }
  }

  loadData(timePeriod?: string, isInterval?: boolean) {
    if (timePeriod != undefined) {
      this.timePeriod = timePeriod;
    }
    if (isInterval == undefined) {
      isInterval = false;
    }
    // load historical metrics data
    this.loading = `${this.i18nSvc.fanyi('monitor.detail.chart.data-loading')}`;
    let metricData$ = this.monitorSvc
      .getMonitorMetricHistoryData(this.instance, this.app, this.metrics, this.metric, this.timePeriod, isInterval)
      .pipe(
        finalize(() => {
          if (!this.worker$) {
            this.loading = null;
          }
          metricData$.unsubscribe();
        })
      )
      .subscribe(
        (message: any) => {
          this.loading = `${this.i18nSvc.fanyi('monitor.detail.chart.data-processing')}`;
          if (message.code === 0 && message.data.values != undefined) {
            this.worker$ = createWorker({
              values: message.data.values,
              isInterval
            }).subscribe((rsp: WorkerResult) => {
              if (rsp.progress === 100 && rsp.data) {
                this.lineHistoryTheme = { ...this.lineHistoryTheme, ...rsp.data };
                this.eChartOption = this.lineHistoryTheme;
                if (this.echartsInstance != undefined) {
                  this.echartsInstance.setOption(this.eChartOption, {
                    replaceMerge: ['xAxis', 'yAxis', 'series']
                  });
                }
                this.worker$.unsubscribe();
                this.worker$ = null;
                this.loading = null;
                // Auto load prediction data silently after main data loaded
                setTimeout(() => this.loadPredictionData(true), 500);
              } else if (rsp.progress > 0) {
                this.loading = `${this.i18nSvc.fanyi('monitor.detail.chart.data-processing')} ${rsp.progress}%`;
              }
            });
          } else {
            this.eChartOption = this.lineHistoryTheme;
            this.eChartOption.title = {
              text: `${`${this.metrics}.${this.metric}` + '\n\n\n'}${this.i18nSvc.fanyi('monitor.detail.chart.no-data')}`,
              textStyle: {
                fontSize: 16,
                fontFamily: 'monospace',
                textShadowOffsetX: 10
              },
              left: 'center',
              top: 'center'
            };
            if (this.echartsInstance != undefined) {
              this.echartsInstance.setOption(this.eChartOption, {
                replaceMerge: ['title']
              });
            }
          }
        },
        error => {
          console.error(error.msg);
        }
      );
  }

  loadPredictionData(isAuto: boolean = false) {
    if (!isAuto) {
      this.loading = 'Forecasting...';
    }

    // CRITICAL FIX: Pass 'this.timePeriod' so backend knows the view context (1h, 6h, 1d, 1w)
    // and can calculate appropriate forecast duration (e.g. 1/5 of view length).
    // We pass null for predictTime to rely on backend auto-calculation.
    let predictionData$ = this.monitorSvc
      .getMonitorMetricsPredictionData(this.instance, this.app, this.metrics, this.metric, this.timePeriod)
      .pipe(
        finalize(() => {
          if (!isAuto) {
            this.loading = null;
          }
          predictionData$.unsubscribe();
        })
      )
      .subscribe(
        (message: any) => {
          if (message.code === 0 && message.data) {
            // Get current series to append forecast data
            const currentSeries = (this.eChartOption.series as any[]) || [];
            const newSeries = [...currentSeries];

            let hasData = false;
            // Get translations for chart legend
            const forecastName = this.i18nSvc.fanyi('monitor.detail.chart.forecast');
            // Separate names for clarity
            const confidenceLowerName = this.i18nSvc.fanyi('monitor.detail.chart.confidence.lower');
            const confidenceUpperName = this.i18nSvc.fanyi('monitor.detail.chart.confidence.upper');
            // Fallback if translation keys don't exist
            const lowerName = confidenceLowerName.includes('monitor.detail') ? 'Lower Bound' : confidenceLowerName;
            const upperName = confidenceUpperName.includes('monitor.detail') ? 'Upper Bound' : confidenceUpperName;

            // Iterate over prediction results
            for (const results of Object.values(message.data)) {
              const predictions = results as any[];
              if (!predictions || predictions.length === 0) continue;
              hasData = true;

              // Parse prediction data
              const forecastLineData = [];
              const lowerBoundData = [];
              const diffData = [];
              const upperBoundData = [];

              for (const p of predictions) {
                const val = p.forecast;
                const upper = p.upperBound;
                const lower = p.lowerBound;
                const t = p.time;

                forecastLineData.push([t, val]);
                // Basic data for lower bound
                lowerBoundData.push([t, lower]);
                // Diff data for the stacked band (upper - lower)
                diffData.push([t, upper - lower]);
                // Actual upper bound data for separate invisible series
                upperBoundData.push([t, upper]);
              }

              // 1. Lower Bound Series (Base of the stack)
              // This series serves two purposes:
              // a) It is the bottom edge of the band.
              // b) It shows the correct "Lower Bound" value in the tooltip.
              newSeries.push({
                name: lowerName,
                type: 'line',
                data: lowerBoundData,
                stack: `confidence-band`,
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0 },
                // Show tooltip for this series
                tooltip: { show: true },
                silent: false // Allow hover to trigger tooltip
              });

              // 2. Band Width Series (Stacked on top of Lower Bound)
              // This series draws the filled area.
              // It MUST be hidden from tooltip because its value is the "difference", not the absolute value.
              newSeries.push({
                name: 'Confidence Band', // Internal name
                type: 'line',
                data: diffData,
                stack: `confidence-band`,
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: {
                  opacity: 0.3,
                  color: '#A6C8FF'
                },
                // CRITICAL: Hide this series from tooltip so users don't see the diff value
                tooltip: { show: false },
                silent: true // Ignore mouse events so it doesn't trigger tooltip
              });

              // 3. Upper Bound Series (Invisible, Non-Stacked)
              // This series is purely for the Tooltip. It shows the correct "Upper Bound" value.
              newSeries.push({
                name: upperName,
                type: 'line',
                data: upperBoundData,
                // Do NOT stack this series
                stack: null,
                symbol: 'none',
                lineStyle: { opacity: 0 }, // Invisible line
                areaStyle: { opacity: 0 }, // No area
                // Show tooltip for this series
                tooltip: { show: true },
                silent: false
              });

              // 4. Forecast Main Line
              newSeries.push({
                name: `${forecastName}`,
                type: 'line',
                data: forecastLineData,
                smooth: true,
                lineStyle: {
                  type: 'dashed',
                  width: 2,
                  color: '#ffa318'
                },
                itemStyle: {
                  opacity: 0,
                  color: '#ffa318'
                },
                symbol: 'none',
                z: 5
              });
            }

            if (hasData) {
              this.eChartOption.series = newSeries;
              if (this.echartsInstance) {
                this.echartsInstance.setOption({
                  series: newSeries
                });
              }
              if (!isAuto) {
                this.notifySvc.success(this.i18nSvc.fanyi('common.notify.success'), 'Forecast data loaded.');
              }
            } else {
              if (!isAuto) {
                this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.warning'), 'Insufficient history data for prediction.');
              }
            }
          } else {
            console.warn(`Prediction failed or no data returned: ${message.msg}`);
            if (!isAuto) {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.error'), message.msg || 'Prediction failed.');
            }
          }
        },
        error => {
          console.error(error);
          if (!isAuto) {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.error'), error.msg || 'Network error during prediction.');
          }
        }
      );
  }

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }

  ngOnDestroy(): void {
    // Dispose of the chart instance when component is destroyed
    if (this.echartsInstance) {
      this.echartsInstance.dispose();
      this.echartsInstance = null;
    }
    if (this.worker$) {
      this.worker$.unsubscribe();
    }
  }
}
