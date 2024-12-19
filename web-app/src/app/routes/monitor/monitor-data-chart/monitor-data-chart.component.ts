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

  private getAllGradientColors(): Array<[string, string]> {
    const gradientPairs: Array<[string, string]> = [];
    Object.values(this.colors).forEach(colorPair => {
      gradientPairs.push([colorPair[0], colorPair[1]]);
    });
    return gradientPairs;
  }

  private getRandomGradientPair(): [string, string] {
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
                        { offset: 0, color: '#56CCF2' },
                        { offset: 1, color: '#2F80ED' }
                      ]
                    }
                  };
                } else {
                  // Multiple lines - use random gradient
                  let gradientColors: [string, string];
                  do {
                    gradientColors = this.getRandomGradientPair();
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
                        { offset: 1, color: gradientColors[1] }
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
    // 蓝色系列
    blue1: ['#2E5B9F', '#89C4F4'], // 深蓝到天蓝
    blue2: ['#1B4F72', '#5DADE2'], // 海军蓝到亮蓝
    blue3: ['#21618C', '#85C1E9'], // 普鲁士蓝到浅蓝
    blue4: ['#2874A6', '#AED6F1'], // 钴蓝到粉蓝
    blue5: ['#2E86C1', '#D6EAF8'], // 深天蓝到淡蓝

    // 绿色系列
    green1: ['#186A3B', '#82E0AA'], // 森林绿到薄荷绿
    green2: ['#0B5345', '#76D7C4'], // 墨绿到青绿
    green3: ['#196F3D', '#A9DFBF'], // 深绿到淡绿
    green4: ['#1E8449', '#D4EFDF'], // 翠绿到薄荷奶绿
    green5: ['#28B463', '#EAFAF1'], // 青葱绿到清新绿

    // 紫色系列
    purple1: ['#4A235A', '#BB8FCE'], // 深紫到淡紫
    purple2: ['#6C3483', '#D2B4DE'], // 皇室紫到薰衣草
    purple3: ['#8E44AD', '#E8DAEF'], // 紫罗兰到浅紫
    purple4: ['#7D3C98', '#EBDEF0'], // 葡萄紫到粉紫
    purple5: ['#9B59B6', '#F4ECF7'], // 兰花紫到淡粉紫

    // 红色系列
    red1: ['#922B21', '#F1948A'], // 深红到粉红
    red2: ['#B03A2E', '#F5B7B1'], // 砖红到浅粉
    red3: ['#C0392B', '#FADBD8'], // 红砖到淡粉
    red4: ['#CD6155', '#FDEDEC'], // 珊瑚红到浅粉红
    red5: ['#E74C3C', '#FEF5E7'], // 鲜红到粉白

    // 橙色系列
    orange1: ['#CA6F1E', '#F8C471'], // 赭石到杏黄
    orange2: ['#D35400', '#FAD7A0'], // 南瓜橙到淡橙
    orange3: ['#E67E22', '#FCF3CF'], // 胡萝卜橙到米黄
    orange4: ['#EB984E', '#FEF9E7'], // 芒果橙到淡黄
    orange5: ['#F39C12', '#FEF5E7'], // 明橙到米白

    pink1: ['#D81B60', '#F48FB1'],
    pink2: ['#E91E63', '#F8BBD0'],
    pink3: ['#EC407A', '#FCE4EC'],
    pink4: ['#F06292', '#FFF1F5'],
    pink5: ['#F48FB1', '#FFF5F8'],

    // 青色系列
    cyan1: ['#006064', '#80DEEA'],
    cyan2: ['#0097A7', '#B2EBF2'],
    cyan3: ['#00ACC1', '#E0F7FA'],
    cyan4: ['#00BCD4', '#F0FFFF'],
    cyan5: ['#26C6DA', '#F5FFFF'],

    // 棕色系列
    brown1: ['#3E2723', '#BCAAA4'],
    brown2: ['#4E342E', '#D7CCC8'],
    brown3: ['#5D4037', '#EFEBE9'],
    brown4: ['#6D4C41', '#F5F5F5'],
    brown5: ['#795548', '#FAFAFA'],

    // 灰色系列
    grey1: ['#212121', '#BDBDBD'],
    grey2: ['#424242', '#E0E0E0'],
    grey3: ['#616161', '#EEEEEE'],
    grey4: ['#757575', '#F5F5F5'],
    grey5: ['#9E9E9E', '#FAFAFA'],

    // 现代商务配色
    business1: ['#1A237E', '#7986CB'], // 靛蓝到薰衣草
    business2: ['#0D47A1', '#64B5F6'], // 皇家蓝到天蓝
    business3: ['#006064', '#4DD0E1'], // 墨青到碧蓝
    business4: ['#004D40', '#4DB6AC'], // 墨绿到青绿
    business5: ['#311B92', '#9575CD'], // 深紫到淡紫

    // 科技感配色
    tech1: ['#01579B', '#03A9F4'],
    tech2: ['#006064', '#00BCD4'],
    tech3: ['#1A237E', '#3F51B5'],
    tech4: ['#311B92', '#673AB7'],
    tech5: ['#880E4F', '#E91E63'],

    // 自然色系
    nature1: ['#1B5E20', '#81C784'],
    nature2: ['#004D40', '#80CBC4'],
    nature3: ['#827717', '#DCE775'],
    nature4: ['#3E2723', '#A1887F'],
    nature5: ['#BF360C', '#FF8A65'],

    // 海洋色系
    ocean1: ['#01579B', '#4FC3F7'],
    ocean2: ['#006064', '#4DD0E1'],
    ocean3: ['#0277BD', '#81D4FA'],
    ocean4: ['#00838F', '#80DEEA'],
    ocean5: ['#0288D1', '#B3E5FC'],

    // 日落色系
    sunset1: ['#BF360C', '#FFAB91'],
    sunset2: ['#D84315', '#FFCCBC'],
    sunset3: ['#E65100', '#FFB74D'],
    sunset4: ['#F57C00', '#FFE0B2'],
    sunset5: ['#FF6F00', '#FFE082'],

    // 梦幻色系
    dream1: ['#AA00FF', '#EA80FC'],
    dream2: ['#C51162', '#FF4081'],
    dream3: ['#6200EA', '#B388FF'],
    dream4: ['#2962FF', '#82B1FF'], // 深蓝到亮蓝
    dream5: ['#00BFA5', '#64FFDA'], // 青绿到薄荷

    // 浪漫色系
    romantic1: ['#C2185B', '#F48FB1'], // 玫红到粉红
    romantic2: ['#D81B60', '#F8BBD0'], // 深粉到浅粉
    romantic3: ['#AD1457', '#EC407A'], // 紫粉到玫粉
    romantic4: ['#880E4F', '#E91E63'], // 深粉到亮粉
    romantic5: ['#BC477B', '#FFB6C1'], // 玫瑰粉到浅粉

    // 糖果色系
    candy1: ['#FF1744', '#FF8A80'], // 亮红到粉红
    candy2: ['#F50057', '#FF80AB'], // 玫红到粉红
    candy3: ['#D500F9', '#EA80FC'], // 紫到亮紫
    candy4: ['#651FFF', '#B388FF'], // 深紫到淡紫
    candy5: ['#3D5AFE', '#8C9EFF'], // 靛蓝到淡蓝

    // 秋季色系
    autumn1: ['#BF360C', '#FFAB91'], // 深橙到淡橙
    autumn2: ['#8D6E63', '#D7CCC8'], // 棕色到米色
    autumn3: ['#6D4C41', '#BCAAA4'], // 深棕到浅棕
    autumn4: ['#795548', '#A1887F'], // 棕褐到浅褐
    autumn5: ['#4E342E', '#8D6E63'], // 深褐到褐色

    // 冬季色系
    winter1: ['#263238', '#B0BEC5'], // 深灰到浅灰
    winter2: ['#37474F', '#CFD8DC'], // 青灰到银灰
    winter3: ['#455A64', '#ECEFF1'], // 钢青到浅灰
    winter4: ['#546E7A', '#F5F5F5'], // 灰蓝到白
    winter5: ['#607D8B', '#FAFAFA'], // 蓝灰到纯白

    // 春季色系
    spring1: ['#2E7D32', '#A5D6A7'], // 绿到嫩绿
    spring2: ['#558B2F', '#C5E1A5'], // 草绿到浅绿
    spring3: ['#0288D1', '#81D4FA'], // 天蓝到浅蓝
    spring4: ['#00897B', '#80CBC4'], // 青绿到浅青
    spring5: ['#F9A825', '#FFF59D'], // 金黄到浅黄

    // 夏季色系
    summer1: ['#00B8D4', '#84FFFF'], // 湖蓝到浅青
    summer2: ['#00E5FF', '#18FFFF'], // 亮青到浅青
    summer3: ['#1DE9B6', '#A7FFEB'], // 碧绿到浅绿
    summer4: ['#00E676', '#B9F6CA'], // 翠绿到浅绿
    summer5: ['#76FF03', '#F4FF81'], // 青柠到浅黄

    // 高端商务
    business6: ['#283593', '#5C6BC0'], // 深蓝到靛蓝
    business7: ['#1565C0', '#42A5F5'], // 蓝到亮蓝
    business8: ['#0097A7', '#26C6DA'], // 青到亮青
    business9: ['#00796B', '#26A69A'], // 青绿到浅绿
    business10: ['#2E7D32', '#66BB6A'] // 绿到亮绿
  };
}
