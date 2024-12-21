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

import { Component, Inject, Input, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { EChartsOption } from 'echarts';
import { finalize } from 'rxjs/operators';

import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-data-chart',
  templateUrl: './monitor-data-chart.component.html',
  styles: []
})
export class MonitorDataChartComponent implements OnInit {
  @Input()
  get monitorId(): number {
    return this._monitorId;
  }
  set monitorId(monitorId: number) {
    this._monitorId = monitorId;
  }
  private _monitorId!: number;
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
  loading: boolean = true;
  echartsInstance!: any;
  // Default historical data period is last 6 hours
  timePeriod: string = '6h';

  constructor(private monitorSvc: MonitorService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

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
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: this.i18nSvc.fanyi('monitors.detail.chart.zoom'),
              back: this.i18nSvc.fanyi('monitors.detail.chart.back')
            },
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            }
          },
          saveAsImage: {
            title: this.i18nSvc.fanyi('monitors.detail.chart.save'),
            emphasis: {
              iconStyle: {
                textPosition: 'left'
              }
            }
          },
          myPeriod1h: {
            show: true,
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-1h'),
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
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-6h'),
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
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-1d'),
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
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-1w'),
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
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-1m'),
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
            title: this.i18nSvc.fanyi('monitors.detail.chart.query-3m'),
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
          end: 100
        }
      ]
    };
    if (this.unit != undefined || this.unit != null) {
      // @ts-ignore
      this.lineHistoryTheme.title.subtext = `${this.i18nSvc.fanyi('monitors.detail.chart.unit')}  ${this.unit}`;
    }
    this.loadData();
  }

  private getAllGradientColors(): Array<[string, string, string]> {
    const gradientTriples: Array<[string, string, string]> = [];
    Object.values(this.colors).forEach(colorTriple => {
      gradientTriples.push([colorTriple[0], colorTriple[1], colorTriple[2]]);
    });
    return gradientTriples;
  }

  private getRandomGradientTriple(): [string, string, string] {
    const allColors = this.getAllGradientColors();
    const randomIndex = Math.floor(Math.random() * allColors.length);
    return allColors[randomIndex];
  }

  loadData(timePeriod?: string, isInterval?: boolean) {
    if (timePeriod != undefined) {
      this.timePeriod = timePeriod;
    }
    if (isInterval == undefined) {
      isInterval = false;
    }
    // load historical metrics data
    this.loading = true;
    let metricData$ = this.monitorSvc
      .getMonitorMetricHistoryData(this.monitorId, this.app, this.metrics, this.metric, this.timePeriod, isInterval)
      .pipe(
        finalize(() => {
          this.loading = false;
          metricData$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data.values != undefined) {
            let values: Record<string, any> = message.data.values;
            let legend: string[] = [];
            Object.keys(values).forEach(key => {
              legend.push(key);
            });
            if (!isInterval || legend.length > 1) {
              if (legend.length > 1) {
                this.lineHistoryTheme.legend = {
                  type: 'scroll',
                  orient: 'horizontal',
                  align: 'auto',
                  bottom: 40,
                  pageIconSize: 10,
                  pageButtonGap: 10,
                  pageButtonPosition: 'end',
                  data: legend
                };
              }
              this.lineHistoryTheme.series = [];
              const usedColors = new Set<string>();
              let valueKeyArr = Object.keys(values);
              for (let index = 0; index < valueKeyArr.length; index++) {
                let key = valueKeyArr[index];
                let seriesData: Array<{ value: any }> = [];
                values[key].forEach((item: { time: number; origin: any }) => {
                  seriesData.push({
                    value: [item.time, item.origin]
                  });
                });

                // Define line color based on number of series
                let lineStyle: any;
                if (valueKeyArr.length === 1) {
                  // Single line - use gradient color
                  lineStyle = {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 0,
                      colorStops: [
                        { offset: 0, color: 'rgba(86, 204, 242, 0.8)' }, // 起始色
                        { offset: 0.5, color: 'rgba(47, 128, 237, 0.6)' }, // 中间色
                        { offset: 1, color: 'rgba(26, 86, 184, 0.4)' } // 结束色
                      ]
                    }
                  };
                } else {
                  // Multiple lines - use random gradient
                  let gradientColors: [string, string, string];
                  do {
                    gradientColors = this.getRandomGradientTriple();
                  } while (usedColors.has(gradientColors[0]));

                  usedColors.add(gradientColors[0]);

                  lineStyle = {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 1,
                      y2: 0,
                      colorStops: [
                        { offset: 0, color: gradientColors[0] },
                        { offset: 0.5, color: gradientColors[1] },
                        { offset: 1, color: gradientColors[2] }
                      ]
                    }
                  };
                }

                this.lineHistoryTheme.series.push({
                  name: key,
                  type: 'line',
                  smooth: true,
                  showSymbol: false,
                  emphasis: {
                    focus: 'series'
                  },
                  lineStyle: lineStyle,
                  // Add itemStyle to match the line color in the legend
                  itemStyle: {
                    color: valueKeyArr.length === 1 ? '#2F80ED' : lineStyle.color.colorStops[0].color
                  },
                  data: seriesData
                });
              }
            } else {
              legend = ['Max', 'Min', 'Mean'];
              this.lineHistoryTheme.legend = {
                orient: 'vertical',
                align: 'auto',
                right: '10%',
                top: '10%',
                data: legend
              };
              let maxSeriesData: Array<{ value: any }> = [];
              let minSeriesData: Array<{ value: any }> = [];
              let meanSeriesData: Array<{ value: any }> = [];
              this.lineHistoryTheme.series = [];
              if (values != undefined && Object.keys(values).length > 0) {
                values[Object.keys(values)[0]].forEach((item: { time: number; mean: any; max: any; min: any }) => {
                  maxSeriesData.push({
                    value: [item.time, item.max]
                  });
                  minSeriesData.push({
                    value: [item.time, item.min]
                  });
                  meanSeriesData.push({
                    value: [item.time, item.mean]
                  });
                });
              }
              this.lineHistoryTheme.series.push({
                name: 'Max',
                type: 'line',
                smooth: true,
                showSymbol: false,
                emphasis: {
                  focus: 'series'
                },
                data: maxSeriesData
              });
              this.lineHistoryTheme.series.push({
                name: 'Min',
                type: 'line',
                smooth: true,
                showSymbol: false,
                emphasis: {
                  focus: 'series'
                },
                data: minSeriesData
              });
              this.lineHistoryTheme.series.push({
                name: 'Mean',
                type: 'line',
                smooth: true,
                showSymbol: false,
                emphasis: {
                  focus: 'series'
                },
                data: meanSeriesData
              });
            }
            this.eChartOption = this.lineHistoryTheme;
            if (this.echartsInstance != undefined) {
              this.echartsInstance.setOption(this.eChartOption, {
                replaceMerge: ['xAxis', 'yAxis', 'series']
              });
            }
          } else {
            this.eChartOption = this.lineHistoryTheme;
            this.eChartOption.title = {
              text: `${`${this.metrics}.${this.metric}` + '\n\n\n'}${this.i18nSvc.fanyi('monitors.detail.chart.no-data')}`,
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

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }

  private colors = {
    blue1: ['rgba(43, 88, 118, 0.8)', 'rgba(78, 67, 118, 0.8)', 'rgba(43, 88, 118, 0.8)'],
    blue2: ['rgba(49, 71, 85, 0.8)', 'rgba(38, 160, 218, 0.8)', 'rgba(49, 71, 85, 0.8)'],
    blue3: ['rgba(119, 161, 211, 0.8)', 'rgba(121, 203, 202, 0.8)', 'rgba(119, 161, 211, 0.8)'],
    blue4: ['rgba(255, 110, 127, 0.8)', 'rgba(191, 233, 255, 0.8)', 'rgba(255, 110, 127, 0.8)'],
    blue5: ['rgba(229, 45, 39, 0.8)', 'rgba(179, 18, 23, 0.8)', 'rgba(229, 45, 39, 0.8)'],
    green1: ['rgba(96, 56, 19, 0.8)', 'rgba(178, 159, 148, 0.8)', 'rgba(96, 56, 19, 0.8)'],
    green2: ['rgba(22, 160, 133, 0.8)', 'rgba(244, 208, 63, 0.8)', 'rgba(22, 160, 133, 0.8)'],
    green3: ['rgba(211, 16, 39, 0.8)', 'rgba(234, 56, 77, 0.8)', 'rgba(211, 16, 39, 0.8)'],
    green4: ['rgba(237, 229, 116, 0.8)', 'rgba(225, 245, 196, 0.8)', 'rgba(237, 229, 116, 0.8)'],
    green5: ['rgba(2, 170, 176, 0.8)', 'rgba(0, 205, 172, 0.8)', 'rgba(2, 170, 176, 0.8)'],
    purple1: ['rgba(218, 34, 255, 0.8)', 'rgba(151, 51, 238, 0.8)', 'rgba(218, 34, 255, 0.8)'],
    purple2: ['rgba(52, 143, 80, 0.8)', 'rgba(86, 180, 211, 0.8)', 'rgba(52, 143, 80, 0.8)'],
    purple3: ['rgba(60, 165, 92, 0.8)', 'rgba(181, 172, 73, 0.8)', 'rgba(60, 165, 92, 0.8)'],
    purple4: ['rgba(204, 149, 192, 0.8)', 'rgba(219, 212, 180, 0.8)', 'rgba(204, 149, 192, 0.8)'],
    purple5: ['rgba(0, 57, 115, 0.8)', 'rgba(229, 229, 190, 0.8)', 'rgba(0, 57, 115, 0.8)'],
    red1: ['rgba(229, 93, 135, 0.8)', 'rgba(95, 195, 228, 0.8)', 'rgba(229, 93, 135, 0.8)'],
    red2: ['rgba(64, 59, 74, 0.8)', 'rgba(231, 233, 187, 0.8)', 'rgba(64, 59, 74, 0.8)'],
    red3: ['rgba(240, 152, 25, 0.8)', 'rgba(237, 222, 93, 0.8)', 'rgba(240, 152, 25, 0.8)'],
    red4: ['rgba(255, 81, 47, 0.8)', 'rgba(221, 36, 118, 0.8)', 'rgba(255, 81, 47, 0.8)'],
    red5: ['rgba(170, 7, 107, 0.8)', 'rgba(97, 4, 95, 0.8)', 'rgba(170, 7, 107, 0.8)'],
    orange1: ['rgba(26, 41, 128, 0.8)', 'rgba(38, 208, 206, 0.8)', 'rgba(26, 41, 128, 0.8)'],
    orange2: ['rgba(255, 81, 47, 0.8)', 'rgba(240, 152, 25, 0.8)', 'rgba(255, 81, 47, 0.8)'],
    orange3: ['rgba(29, 43, 100, 0.8)', 'rgba(248, 205, 218, 0.8)', 'rgba(29, 43, 100, 0.8)'],
    orange4: ['rgba(31, 162, 255, 0.8)', 'rgba(18, 216, 250, 0.8)', 'rgba(31, 162, 255, 0.8)'],
    orange5: ['rgba(76, 184, 196, 0.8)', 'rgba(60, 211, 173, 0.8)', 'rgba(76, 184, 196, 0.8)'],
    custom1: ['rgba(221, 94, 137, 0.8)', 'rgba(247, 187, 151, 0.8)', 'rgba(221, 94, 137, 0.8)'],
    custom2: ['rgba(235, 51, 73, 0.8)', 'rgba(244, 92, 67, 0.8)', 'rgba(235, 51, 73, 0.8)'],
    custom3: ['rgba(29, 151, 108, 0.8)', 'rgba(147, 249, 185, 0.8)', 'rgba(29, 151, 108, 0.8)'],
    custom4: ['rgba(255, 128, 8, 0.8)', 'rgba(255, 200, 55, 0.8)', 'rgba(255, 128, 8, 0.8)'],
    custom5: ['rgba(22, 34, 42, 0.8)', 'rgba(58, 96, 115, 0.8)', 'rgba(22, 34, 42, 0.8)'],
    custom6: ['rgba(31, 28, 44, 0.8)', 'rgba(146, 141, 171, 0.8)', 'rgba(31, 28, 44, 0.8)'],
    custom7: ['rgba(97, 67, 133, 0.8)', 'rgba(81, 99, 149, 0.8)', 'rgba(97, 67, 133, 0.8)'],
    custom8: ['rgba(71, 118, 230, 0.8)', 'rgba(142, 84, 233, 0.8)', 'rgba(71, 118, 230, 0.8)'],
    custom9: ['rgba(8, 80, 120, 0.8)', 'rgba(133, 216, 206, 0.8)', 'rgba(8, 80, 120, 0.8)'],
    custom10: ['rgba(43, 192, 228, 0.8)', 'rgba(234, 236, 198, 0.8)', 'rgba(43, 192, 228, 0.8)'],
    custom11: ['rgba(19, 78, 94, 0.8)', 'rgba(113, 178, 128, 0.8)', 'rgba(19, 78, 94, 0.8)'],
    custom12: ['rgba(92, 37, 141, 0.8)', 'rgba(67, 137, 162, 0.8)', 'rgba(92, 37, 141, 0.8)'],
    custom13: ['rgba(117, 127, 154, 0.8)', 'rgba(215, 221, 232, 0.8)', 'rgba(117, 127, 154, 0.8)'],
    custom14: ['rgba(35, 37, 38, 0.8)', 'rgba(65, 67, 69, 0.8)', 'rgba(35, 37, 38, 0.8)'],
    custom15: ['rgba(28, 216, 210, 0.8)', 'rgba(147, 237, 199, 0.8)', 'rgba(28, 216, 210, 0.8)'],
    custom16: ['rgba(61, 126, 170, 0.8)', 'rgba(255, 228, 122, 0.8)', 'rgba(61, 126, 170, 0.8)'],
    custom17: ['rgba(40, 48, 72, 0.8)', 'rgba(133, 147, 152, 0.8)', 'rgba(40, 48, 72, 0.8)'],
    custom18: ['rgba(36, 198, 220, 0.8)', 'rgba(81, 74, 157, 0.8)', 'rgba(36, 198, 220, 0.8)'],
    custom19: ['rgba(220, 36, 36, 0.8)', 'rgba(74, 86, 157, 0.8)', 'rgba(220, 36, 36, 0.8)'],
    custom20: ['rgba(237, 66, 100, 0.8)', 'rgba(255, 237, 188, 0.8)', 'rgba(237, 66, 100, 0.8)'],
    custom21: ['rgba(218, 226, 248, 0.8)', 'rgba(214, 164, 164, 0.8)', 'rgba(218, 226, 248, 0.8)'],
    custom22: ['rgba(236, 233, 230, 0.8)', 'rgba(255, 255, 255, 0.8)', 'rgba(236, 233, 230, 0.8)'],
    custom23: ['rgba(116, 116, 191, 0.8)', 'rgba(52, 138, 199, 0.8)', 'rgba(116, 116, 191, 0.8)'],
    custom24: ['rgba(236, 111, 102, 0.8)', 'rgba(243, 161, 131, 0.8)', 'rgba(236, 111, 102, 0.8)'],
    custom25: ['rgba(95, 44, 130, 0.8)', 'rgba(73, 160, 157, 0.8)', 'rgba(95, 44, 130, 0.8)'],
    custom26: ['rgba(192, 72, 72, 0.8)', 'rgba(72, 0, 72, 0.8)', 'rgba(192, 72, 72, 0.8)'],
    custom27: ['rgba(228, 58, 21, 0.8)', 'rgba(230, 82, 69, 0.8)', 'rgba(228, 58, 21, 0.8)'],
    custom28: ['rgba(65, 77, 11, 0.8)', 'rgba(114, 122, 23, 0.8)', 'rgba(65, 77, 11, 0.8)'],
    custom29: ['rgba(252, 53, 76, 0.8)', 'rgba(10, 191, 188, 0.8)', 'rgba(252, 53, 76, 0.8)'],
    custom30: ['rgba(75, 108, 183, 0.8)', 'rgba(24, 40, 72, 0.8)', 'rgba(75, 108, 183, 0.8)'],
    custom31: ['rgba(248, 87, 166, 0.8)', 'rgba(255, 88, 88, 0.8)', 'rgba(248, 87, 166, 0.8)'],
    custom32: ['rgba(167, 55, 55, 0.8)', 'rgba(122, 40, 40, 0.8)', 'rgba(167, 55, 55, 0.8)'],
    custom33: ['rgba(213, 51, 105, 0.8)', 'rgba(203, 173, 109, 0.8)', 'rgba(213, 51, 105, 0.8)'],
    custom34: ['rgba(233, 211, 98, 0.8)', 'rgba(51, 51, 51, 0.8)', 'rgba(233, 211, 98, 0.8)'],
    custom35: ['rgba(222, 98, 98, 0.8)', 'rgba(255, 184, 140, 0.8)', 'rgba(222, 98, 98, 0.8)'],
    custom36: ['rgba(102, 102, 0, 0.8)', 'rgba(153, 153, 102, 0.8)', 'rgba(102, 102, 0, 0.8)'],
    custom37: ['rgba(255, 238, 238, 0.8)', 'rgba(221, 239, 187, 0.8)', 'rgba(255, 238, 238, 0.8)'],
    custom38: ['rgba(239, 239, 187, 0.8)', 'rgba(212, 211, 221, 0.8)', 'rgba(239, 239, 187, 0.8)'],
    custom39: ['rgba(194, 21, 0, 0.8)', 'rgba(255, 197, 0, 0.8)', 'rgba(194, 21, 0, 0.8)'],
    custom40: ['rgba(33, 95, 0, 0.8)', 'rgba(228, 228, 217, 0.8)', 'rgba(33, 95, 0, 0.8)'],
    custom41: ['rgba(80, 201, 195, 0.8)', 'rgba(150, 222, 218, 0.8)', 'rgba(80, 201, 195, 0.8)'],
    custom42: ['rgba(97, 97, 97, 0.8)', 'rgba(155, 197, 195, 0.8)', 'rgba(97, 97, 97, 0.8)'],
    custom43: ['rgba(221, 214, 243, 0.8)', 'rgba(250, 172, 168, 0.8)', 'rgba(221, 214, 243, 0.8)'],
    custom44: ['rgba(93, 65, 87, 0.8)', 'rgba(168, 202, 186, 0.8)', 'rgba(93, 65, 87, 0.8)'],
    custom45: ['rgba(230, 218, 218, 0.8)', 'rgba(39, 64, 70, 0.8)', 'rgba(230, 218, 218, 0.8)'],
    custom46: ['rgba(218, 210, 153, 0.8)', 'rgba(176, 218, 185, 0.8)', 'rgba(218, 210, 153, 0.8)'],
    custom47: ['rgba(211, 149, 155, 0.8)', 'rgba(191, 230, 186, 0.8)', 'rgba(211, 149, 155, 0.8)'],
    custom48: ['rgba(0, 210, 255, 0.8)', 'rgba(58, 123, 213, 0.8)', 'rgba(0, 210, 255, 0.8)'],
    custom49: ['rgba(135, 0, 0, 0.8)', 'rgba(25, 10, 5, 0.8)', 'rgba(135, 0, 0, 0.8)'],
    custom50: ['rgba(185, 147, 214, 0.8)', 'rgba(140, 166, 219, 0.8)', 'rgba(185, 147, 214, 0.8)'],
    custom51: ['rgba(100, 145, 115, 0.8)', 'rgba(219, 213, 164, 0.8)', 'rgba(100, 145, 115, 0.8)'],
    custom52: ['rgba(201, 255, 191, 0.8)', 'rgba(255, 175, 189, 0.8)', 'rgba(201, 255, 191, 0.8)'],
    custom53: ['rgba(96, 108, 136, 0.8)', 'rgba(63, 76, 107, 0.8)', 'rgba(96, 108, 136, 0.8)'],
    custom54: ['rgba(0, 0, 0, 0.8)', 'rgba(83, 52, 109, 0.8)', 'rgba(0, 0, 0, 0.8)'],
    custom55: ['rgba(251, 211, 233, 0.8)', 'rgba(187, 55, 125, 0.8)', 'rgba(251, 211, 233, 0.8)'],
    custom56: ['rgba(173, 209, 0, 0.8)', 'rgba(123, 146, 10, 0.8)', 'rgba(173, 209, 0, 0.8)'],
    custom57: ['rgba(255, 78, 80, 0.8)', 'rgba(249, 212, 35, 0.8)', 'rgba(255, 78, 80, 0.8)'],
    custom58: ['rgba(240, 194, 123, 0.8)', 'rgba(75, 18, 72, 0.8)', 'rgba(240, 194, 123, 0.8)'],
    custom59: ['rgba(0, 0, 0, 0.8)', 'rgba(231, 76, 60, 0.8)', 'rgba(0, 0, 0, 0.8)'],
    custom60: ['rgba(170, 255, 169, 0.8)', 'rgba(17, 255, 189, 0.8)', 'rgba(170, 255, 169, 0.8)'],
    custom61: ['rgba(179, 255, 171, 0.8)', 'rgba(18, 255, 247, 0.8)', 'rgba(179, 255, 171, 0.8)'],
    custom62: ['rgba(120, 2, 6, 0.8)', 'rgba(6, 17, 97, 0.8)', 'rgba(120, 2, 6, 0.8)'],
    custom63: ['rgba(157, 80, 187, 0.8)', 'rgba(110, 72, 170, 0.8)', 'rgba(157, 80, 187, 0.8)'],
    custom64: ['rgba(85, 98, 112, 0.8)', 'rgba(255, 107, 107, 0.8)', 'rgba(85, 98, 112, 0.8)'],
    custom65: ['rgba(112, 225, 245, 0.8)', 'rgba(255, 209, 148, 0.8)', 'rgba(112, 225, 245, 0.8)'],
    custom66: ['rgba(0, 198, 255, 0.8)', 'rgba(0, 114, 255, 0.8)', 'rgba(0, 198, 255, 0.8)'],
    custom67: ['rgba(254, 140, 0, 0.8)', 'rgba(248, 54, 0, 0.8)', 'rgba(254, 140, 0, 0.8)'],
    custom68: ['rgba(82, 194, 52, 0.8)', 'rgba(6, 23, 0, 0.8)', 'rgba(82, 194, 52, 0.8)'],
    custom69: ['rgba(72, 85, 99, 0.8)', 'rgba(41, 50, 60, 0.8)', 'rgba(72, 85, 99, 0.8)'],
    custom70: ['rgba(131, 164, 212, 0.8)', 'rgba(182, 251, 255, 0.8)', 'rgba(131, 164, 212, 0.8)'],
    custom71: ['rgba(253, 252, 71, 0.8)', 'rgba(36, 254, 65, 0.8)', 'rgba(253, 252, 71, 0.8)'],
    custom72: ['rgba(171, 186, 171, 0.8)', 'rgba(255, 255, 255, 0.8)', 'rgba(171, 186, 171, 0.8)'],
    custom73: ['rgba(115, 200, 169, 0.8)', 'rgba(55, 59, 68, 0.8)', 'rgba(115, 200, 169, 0.8)'],
    custom74: ['rgba(211, 131, 18, 0.8)', 'rgba(168, 50, 121, 0.8)', 'rgba(211, 131, 18, 0.8)'],
    custom75: ['rgba(30, 19, 12, 0.8)', 'rgba(154, 132, 120, 0.8)', 'rgba(30, 19, 12, 0.8)'],
    custom76: ['rgba(148, 142, 153, 0.8)', 'rgba(46, 20, 55, 0.8)', 'rgba(148, 142, 153, 0.8)'],
    custom77: ['rgba(54, 0, 51, 0.8)', 'rgba(11, 135, 147, 0.8)', 'rgba(54, 0, 51, 0.8)'],
    custom78: ['rgba(255, 161, 127, 0.8)', 'rgba(0, 34, 62, 0.8)', 'rgba(255, 161, 127, 0.8)'],
    custom79: ['rgba(67, 206, 162, 0.8)', 'rgba(24, 90, 157, 0.8)', 'rgba(67, 206, 162, 0.8)'],
    custom80: ['rgba(255, 179, 71, 0.8)', 'rgba(255, 204, 51, 0.8)', 'rgba(255, 179, 71, 0.8)'],
    custom81: ['rgba(100, 65, 165, 0.8)', 'rgba(42, 8, 69, 0.8)', 'rgba(100, 65, 165, 0.8)'],
    custom82: ['rgba(254, 172, 94, 0.8)', 'rgba(199, 121, 208, 0.8)', 'rgba(254, 172, 94, 0.8)'],
    custom83: ['rgba(81, 127, 164, 0.8)', 'rgba(36, 57, 73, 0.8)', 'rgba(81, 127, 164, 0.8)'],
    custom84: ['rgba(255, 0, 132, 0.8)', 'rgba(51, 0, 27, 0.8)', 'rgba(255, 0, 132, 0.8)'],
    custom85: ['rgba(0, 191, 143, 0.8)', 'rgba(0, 21, 16, 0.8)', 'rgba(0, 191, 143, 0.8)'],
    custom86: ['rgba(19, 106, 138, 0.8)', 'rgba(38, 120, 113, 0.8)', 'rgba(19, 106, 138, 0.8)'],
    custom87: ['rgba(142, 158, 171, 0.8)', 'rgba(238, 242, 243, 0.8)', 'rgba(142, 158, 171, 0.8)'],
    custom88: ['rgba(123, 67, 151, 0.8)', 'rgba(220, 36, 48, 0.8)', 'rgba(123, 67, 151, 0.8)'],
    custom89: ['rgba(209, 145, 60, 0.8)', 'rgba(255, 209, 148, 0.8)', 'rgba(209, 145, 60, 0.8)'],
    custom90: ['rgba(241, 242, 181, 0.8)', 'rgba(19, 80, 88, 0.8)', 'rgba(241, 242, 181, 0.8)'],
    custom91: ['rgba(106, 145, 19, 0.8)', 'rgba(20, 21, 23, 0.8)', 'rgba(106, 145, 19, 0.8)'],
    custom92: ['rgba(0, 79, 249, 0.8)', 'rgba(255, 249, 76, 0.8)', 'rgba(0, 79, 249, 0.8)'],
    custom93: ['rgba(82, 82, 82, 0.8)', 'rgba(61, 114, 180, 0.8)', 'rgba(82, 82, 82, 0.8)'],
    custom94: ['rgba(186, 139, 2, 0.8)', 'rgba(24, 24, 24, 0.8)', 'rgba(186, 139, 2, 0.8)'],
    custom95: ['rgba(238, 156, 167, 0.8)', 'rgba(255, 221, 225, 0.8)', 'rgba(238, 156, 167, 0.8)'],
    custom96: ['rgba(48, 67, 82, 0.8)', 'rgba(215, 210, 204, 0.8)', 'rgba(48, 67, 82, 0.8)'],
    custom97: ['rgba(204, 204, 178, 0.8)', 'rgba(117, 117, 25, 0.8)', 'rgba(204, 204, 178, 0.8)'],
    custom98: ['rgba(44, 62, 80, 0.8)', 'rgba(52, 152, 219, 0.8)', 'rgba(44, 62, 80, 0.8)'],
    custom99: ['rgba(252, 0, 255, 0.8)', 'rgba(0, 219, 222, 0.8)', 'rgba(252, 0, 255, 0.8)'],
    custom100: ['rgba(229, 57, 53, 0.8)', 'rgba(227, 93, 91, 0.8)', 'rgba(229, 57, 53, 0.8)'],
    custom101: ['rgba(0, 92, 151, 0.8)', 'rgba(54, 55, 149, 0.8)', 'rgba(0, 92, 151, 0.8)'],
    custom102: ['rgba(244, 107, 69, 0.8)', 'rgba(238, 168, 73, 0.8)', 'rgba(244, 107, 69, 0.8)'],
    custom103: ['rgba(0, 201, 255, 0.8)', 'rgba(146, 254, 157, 0.8)', 'rgba(0, 201, 255, 0.8)'],
    custom104: ['rgba(103, 58, 183, 0.8)', 'rgba(81, 45, 168, 0.8)', 'rgba(103, 58, 183, 0.8)'],
    custom105: ['rgba(118, 184, 82, 0.8)', 'rgba(141, 194, 111, 0.8)', 'rgba(118, 184, 82, 0.8)'],
    custom106: ['rgba(142, 14, 0, 0.8)', 'rgba(31, 28, 24, 0.8)', 'rgba(142, 14, 0, 0.8)'],
    custom107: ['rgba(255, 183, 94, 0.8)', 'rgba(237, 143, 3, 0.8)', 'rgba(255, 183, 94, 0.8)'],
    custom108: ['rgba(194, 229, 156, 0.8)', 'rgba(100, 179, 244, 0.8)', 'rgba(194, 229, 156, 0.8)'],
    custom109: ['rgba(64, 58, 62, 0.8)', 'rgba(190, 88, 105, 0.8)', 'rgba(64, 58, 62, 0.8)'],
    custom110: ['rgba(192, 36, 37, 0.8)', 'rgba(240, 203, 53, 0.8)', 'rgba(192, 36, 37, 0.8)'],
    custom111: ['rgba(178, 69, 146, 0.8)', 'rgba(241, 95, 121, 0.8)', 'rgba(178, 69, 146, 0.8)'],
    custom112: ['rgba(69, 127, 202, 0.8)', 'rgba(86, 145, 200, 0.8)', 'rgba(69, 127, 202, 0.8)'],
    custom113: ['rgba(106, 48, 147, 0.8)', 'rgba(160, 68, 255, 0.8)', 'rgba(106, 48, 147, 0.8)'],
    custom114: ['rgba(234, 205, 163, 0.8)', 'rgba(214, 174, 123, 0.8)', 'rgba(234, 205, 163, 0.8)'],
    custom115: ['rgba(253, 116, 108, 0.8)', 'rgba(255, 144, 104, 0.8)', 'rgba(253, 116, 108, 0.8)'],
    custom116: ['rgba(17, 67, 87, 0.8)', 'rgba(242, 148, 146, 0.8)', 'rgba(17, 67, 87, 0.8)'],
    custom117: ['rgba(30, 60, 114, 0.8)', 'rgba(42, 82, 152, 0.8)', 'rgba(30, 60, 114, 0.8)'],
    custom118: ['rgba(47, 115, 54, 0.8)', 'rgba(170, 58, 56, 0.8)', 'rgba(47, 115, 54, 0.8)'],
    custom119: ['rgba(86, 20, 176, 0.8)', 'rgba(219, 214, 92, 0.8)', 'rgba(86, 20, 176, 0.8)'],
    custom120: ['rgba(77, 160, 176, 0.8)', 'rgba(211, 157, 56, 0.8)', 'rgba(77, 160, 176, 0.8)'],
    custom121: ['rgba(90, 63, 55, 0.8)', 'rgba(44, 119, 68, 0.8)', 'rgba(90, 63, 55, 0.8)'],
    custom122: ['rgba(41, 128, 185, 0.8)', 'rgba(44, 62, 80, 0.8)', 'rgba(41, 128, 185, 0.8)'],
    custom123: ['rgba(0, 153, 247, 0.8)', 'rgba(241, 23, 18, 0.8)', 'rgba(0, 153, 247, 0.8)'],
    custom124: ['rgba(131, 77, 155, 0.8)', 'rgba(208, 78, 214, 0.8)', 'rgba(131, 77, 155, 0.8)'],
    custom125: ['rgba(75, 121, 161, 0.8)', 'rgba(40, 62, 81, 0.8)', 'rgba(75, 121, 161, 0.8)'],
    custom126: ['rgba(0, 0, 0, 0.8)', 'rgba(67, 67, 67, 0.8)', 'rgba(0, 0, 0, 0.8)'],
    custom127: ['rgba(76, 161, 175, 0.8)', 'rgba(196, 224, 229, 0.8)', 'rgba(76, 161, 175, 0.8)'],
    custom128: ['rgba(224, 234, 252, 0.8)', 'rgba(207, 222, 243, 0.8)', 'rgba(224, 234, 252, 0.8)'],
    custom129: ['rgba(186, 83, 112, 0.8)', 'rgba(244, 226, 216, 0.8)', 'rgba(186, 83, 112, 0.8)'],
    custom130: ['rgba(255, 75, 31, 0.8)', 'rgba(31, 221, 255, 0.8)', 'rgba(255, 75, 31, 0.8)'],
    custom131: ['rgba(247, 255, 0, 0.8)', 'rgba(219, 54, 164, 0.8)', 'rgba(247, 255, 0, 0.8)'],
    custom132: ['rgba(168, 0, 119, 0.8)', 'rgba(102, 255, 0, 0.8)', 'rgba(168, 0, 119, 0.8)'],
    custom133: ['rgba(29, 67, 80, 0.8)', 'rgba(164, 57, 49, 0.8)', 'rgba(29, 67, 80, 0.8)'],
    custom134: ['rgba(238, 205, 163, 0.8)', 'rgba(239, 98, 159, 0.8)', 'rgba(238, 205, 163, 0.8)'],
    custom135: ['rgba(22, 191, 253, 0.8)', 'rgba(203, 48, 102, 0.8)', 'rgba(22, 191, 253, 0.8)'],
    custom136: ['rgba(255, 75, 31, 0.8)', 'rgba(255, 144, 104, 0.8)', 'rgba(255, 75, 31, 0.8)'],
    custom137: ['rgba(255, 95, 109, 0.8)', 'rgba(255, 195, 113, 0.8)', 'rgba(255, 95, 109, 0.8)'],
    custom138: ['rgba(33, 150, 243, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(33, 150, 243, 0.8)'],
    custom139: ['rgba(0, 210, 255, 0.8)', 'rgba(146, 141, 171, 0.8)', 'rgba(0, 210, 255, 0.8)'],
    custom140: ['rgba(58, 123, 213, 0.8)', 'rgba(58, 96, 115, 0.8)', 'rgba(58, 123, 213, 0.8)'],
    custom141: ['rgba(11, 72, 107, 0.8)', 'rgba(245, 98, 23, 0.8)', 'rgba(11, 72, 107, 0.8)'],
    custom142: ['rgba(233, 100, 67, 0.8)', 'rgba(144, 78, 149, 0.8)', 'rgba(233, 100, 67, 0.8)'],
    custom143: ['rgba(44, 62, 80, 0.8)', 'rgba(76, 161, 175, 0.8)', 'rgba(44, 62, 80, 0.8)'],
    custom144: ['rgba(44, 62, 80, 0.8)', 'rgba(253, 116, 108, 0.8)', 'rgba(44, 62, 80, 0.8)'],
    custom145: ['rgba(240, 0, 0, 0.8)', 'rgba(220, 40, 30, 0.8)', 'rgba(240, 0, 0, 0.8)'],
    custom146: ['rgba(20, 30, 48, 0.8)', 'rgba(36, 59, 85, 0.8)', 'rgba(20, 30, 48, 0.8)'],
    custom147: ['rgba(66, 39, 90, 0.8)', 'rgba(115, 75, 109, 0.8)', 'rgba(66, 39, 90, 0.8)'],
    custom148: ['rgba(0, 4, 40, 0.8)', 'rgba(0, 78, 146, 0.8)', 'rgba(0, 4, 40, 0.8)'],
    custom149: ['rgba(86, 171, 47, 0.8)', 'rgba(168, 224, 99, 0.8)', 'rgba(86, 171, 47, 0.8)'],
    custom150: ['rgba(203, 45, 62, 0.8)', 'rgba(239, 71, 58, 0.8)', 'rgba(203, 45, 62, 0.8)'],
    custom151: ['rgba(247, 157, 0, 0.8)', 'rgba(100, 243, 140, 0.8)', 'rgba(247, 157, 0, 0.8)'],
    custom152: ['rgba(248, 80, 50, 0.8)', 'rgba(231, 56, 39, 0.8)', 'rgba(248, 80, 50, 0.8)'],
    custom153: ['rgba(252, 234, 187, 0.8)', 'rgba(248, 181, 0, 0.8)', 'rgba(252, 234, 187, 0.8)'],
    custom154: ['rgba(128, 128, 128, 0.8)', 'rgba(63, 173, 168, 0.8)', 'rgba(128, 128, 128, 0.8)'],
    custom155: ['rgba(255, 216, 155, 0.8)', 'rgba(25, 84, 123, 0.8)', 'rgba(255, 216, 155, 0.8)'],
    custom156: ['rgba(189, 195, 199, 0.8)', 'rgba(44, 62, 80, 0.8)', 'rgba(189, 195, 199, 0.8)'],
    custom157: ['rgba(190, 147, 197, 0.8)', 'rgba(123, 198, 204, 0.8)', 'rgba(190, 147, 197, 0.8)'],
    custom158: ['rgba(161, 255, 206, 0.8)', 'rgba(250, 255, 209, 0.8)', 'rgba(161, 255, 206, 0.8)'],
    custom159: ['rgba(78, 205, 196, 0.8)', 'rgba(85, 98, 112, 0.8)', 'rgba(78, 205, 196, 0.8)'],
    custom160: ['rgba(58, 97, 134, 0.8)', 'rgba(137, 37, 62, 0.8)', 'rgba(58, 97, 134, 0.8)'],
    custom161: ['rgba(239, 50, 217, 0.8)', 'rgba(137, 255, 253, 0.8)', 'rgba(239, 50, 217, 0.8)'],
    custom162: ['rgba(222, 97, 97, 0.8)', 'rgba(38, 87, 235, 0.8)', 'rgba(222, 97, 97, 0.8)'],
    custom163: ['rgba(255, 0, 204, 0.8)', 'rgba(51, 51, 153, 0.8)', 'rgba(255, 0, 204, 0.8)'],
    custom164: ['rgba(255, 252, 0, 0.8)', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 252, 0, 0.8)'],
    custom165: ['rgba(255, 126, 95, 0.8)', 'rgba(254, 180, 123, 0.8)', 'rgba(255, 126, 95, 0.8)'],
    custom166: ['rgba(0, 195, 255, 0.8)', 'rgba(255, 255, 28, 0.8)', 'rgba(0, 195, 255, 0.8)'],
    custom167: ['rgba(244, 196, 243, 0.8)', 'rgba(252, 103, 250, 0.8)', 'rgba(244, 196, 243, 0.8)'],
    custom168: ['rgba(65, 41, 90, 0.8)', 'rgba(47, 7, 67, 0.8)', 'rgba(65, 41, 90, 0.8)'],
    custom169: ['rgba(167, 112, 239, 0.8)', 'rgba(207, 139, 243, 0.8)', 'rgba(167, 112, 239, 0.8)'],
    custom170: ['rgba(238, 9, 121, 0.8)', 'rgba(255, 106, 0, 0.8)', 'rgba(238, 9, 121, 0.8)'],
    custom171: ['rgba(243, 144, 79, 0.8)', 'rgba(59, 67, 113, 0.8)', 'rgba(243, 144, 79, 0.8)'],
    custom172: ['rgba(103, 178, 111, 0.8)', 'rgba(76, 162, 205, 0.8)', 'rgba(103, 178, 111, 0.8)'],
    custom173: ['rgba(52, 148, 230, 0.8)', 'rgba(236, 110, 173, 0.8)', 'rgba(52, 148, 230, 0.8)'],
    custom174: ['rgba(219, 230, 246, 0.8)', 'rgba(197, 121, 109, 0.8)', 'rgba(219, 230, 246, 0.8)'],
    custom175: ['rgba(192, 192, 170, 0.8)', 'rgba(28, 239, 255, 0.8)', 'rgba(192, 192, 170, 0.8)'],
    custom176: ['rgba(220, 227, 91, 0.8)', 'rgba(69, 182, 73, 0.8)', 'rgba(220, 227, 91, 0.8)'],
    custom177: ['rgba(232, 203, 192, 0.8)', 'rgba(99, 111, 164, 0.8)', 'rgba(232, 203, 192, 0.8)'],
    custom178: ['rgba(240, 242, 240, 0.8)', 'rgba(0, 12, 64, 0.8)', 'rgba(240, 242, 240, 0.8)'],
    custom179: ['rgba(255, 175, 189, 0.8)', 'rgba(255, 195, 160, 0.8)', 'rgba(255, 175, 189, 0.8)'],
    custom180: ['rgba(67, 198, 172, 0.8)', 'rgba(248, 255, 174, 0.8)', 'rgba(67, 198, 172, 0.8)'],
    custom181: ['rgba(9, 48, 40, 0.8)', 'rgba(35, 122, 87, 0.8)', 'rgba(9, 48, 40, 0.8)'],
    custom182: ['rgba(67, 198, 172, 0.8)', 'rgba(25, 22, 84, 0.8)', 'rgba(67, 198, 172, 0.8)'],
    custom183: ['rgba(69, 104, 220, 0.8)', 'rgba(176, 106, 179, 0.8)', 'rgba(69, 104, 220, 0.8)'],
    custom184: ['rgba(5, 117, 230, 0.8)', 'rgba(2, 27, 121, 0.8)', 'rgba(5, 117, 230, 0.8)'],
    custom185: ['rgba(32, 1, 34, 0.8)', 'rgba(111, 0, 0, 0.8)', 'rgba(32, 1, 34, 0.8)'],
    custom186: ['rgba(68, 160, 141, 0.8)', 'rgba(9, 54, 55, 0.8)', 'rgba(68, 160, 141, 0.8)'],
    custom187: ['rgba(97, 144, 232, 0.8)', 'rgba(167, 191, 232, 0.8)', 'rgba(97, 144, 232, 0.8)'],
    custom188: ['rgba(52, 232, 158, 0.8)', 'rgba(15, 52, 67, 0.8)', 'rgba(52, 232, 158, 0.8)'],
    custom189: ['rgba(247, 151, 30, 0.8)', 'rgba(255, 210, 0, 0.8)', 'rgba(247, 151, 30, 0.8)'],
    custom190: ['rgba(195, 55, 100, 0.8)', 'rgba(29, 38, 113, 0.8)', 'rgba(195, 55, 100, 0.8)'],
    custom191: ['rgba(32, 0, 44, 0.8)', 'rgba(203, 180, 212, 0.8)', 'rgba(32, 0, 44, 0.8)'],
    custom192: ['rgba(214, 109, 117, 0.8)', 'rgba(226, 149, 135, 0.8)', 'rgba(214, 109, 117, 0.8)'],
    custom193: ['rgba(48, 232, 191, 0.8)', 'rgba(255, 130, 53, 0.8)', 'rgba(48, 232, 191, 0.8)'],
    custom194: ['rgba(178, 254, 250, 0.8)', 'rgba(14, 210, 247, 0.8)', 'rgba(178, 254, 250, 0.8)'],
    custom195: ['rgba(74, 194, 154, 0.8)', 'rgba(189, 255, 243, 0.8)', 'rgba(74, 194, 154, 0.8)'],
    custom196: ['rgba(228, 77, 38, 0.8)', 'rgba(241, 101, 41, 0.8)', 'rgba(228, 77, 38, 0.8)'],
    custom197: ['rgba(235, 87, 87, 0.8)', 'rgba(0, 0, 0, 0.8)', 'rgba(235, 87, 87, 0.8)'],
    custom198: ['rgba(242, 153, 74, 0.8)', 'rgba(242, 201, 76, 0.8)', 'rgba(242, 153, 74, 0.8)'],
    custom199: ['rgba(86, 204, 242, 0.8)', 'rgba(47, 128, 237, 0.8)', 'rgba(86, 204, 242, 0.8)'],
    custom200: ['rgba(0, 121, 145, 0.8)', 'rgba(120, 255, 214, 0.8)', 'rgba(0, 121, 145, 0.8)'],
    custom201: ['rgba(0, 0, 70, 0.8)', 'rgba(28, 181, 224, 0.8)', 'rgba(0, 0, 70, 0.8)'],
    custom202: ['rgba(21, 153, 87, 0.8)', 'rgba(21, 87, 153, 0.8)', 'rgba(21, 153, 87, 0.8)'],
    custom203: ['rgba(192, 57, 43, 0.8)', 'rgba(142, 68, 173, 0.8)', 'rgba(192, 57, 43, 0.8)'],
    custom204: ['rgba(239, 59, 54, 0.8)', 'rgba(255, 255, 255, 0.8)', 'rgba(239, 59, 54, 0.8)'],
    custom205: ['rgba(40, 60, 134, 0.8)', 'rgba(69, 162, 71, 0.8)', 'rgba(40, 60, 134, 0.8)'],
    custom206: ['rgba(58, 28, 113, 0.8)', 'rgba(215, 109, 119, 0.8)', 'rgba(58, 28, 113, 0.8)'],
    custom207: ['rgba(203, 53, 107, 0.8)', 'rgba(189, 63, 50, 0.8)', 'rgba(203, 53, 107, 0.8)'],
    custom208: ['rgba(54, 209, 220, 0.8)', 'rgba(91, 134, 229, 0.8)', 'rgba(54, 209, 220, 0.8)'],
    custom209: ['rgba(0, 0, 0, 0.8)', 'rgba(15, 155, 15, 0.8)', 'rgba(0, 0, 0, 0.8)'],
    custom210: ['rgba(28, 146, 210, 0.8)', 'rgba(242, 252, 254, 0.8)', 'rgba(28, 146, 210, 0.8)'],
    custom211: ['rgba(100, 43, 115, 0.8)', 'rgba(198, 66, 110, 0.8)', 'rgba(100, 43, 115, 0.8)'],
    custom212: ['rgba(6, 190, 182, 0.8)', 'rgba(72, 177, 191, 0.8)', 'rgba(6, 190, 182, 0.8)'],
    custom213: ['rgba(12, 235, 235, 0.8)', 'rgba(32, 227, 178, 0.8)', 'rgba(12, 235, 235, 0.8)']
  };
}
