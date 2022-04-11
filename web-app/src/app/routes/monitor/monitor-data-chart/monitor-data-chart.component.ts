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
  // 查询历史数据时间段 默认最近6小时
  timePeriod: string = '6h';
  constructor(private monitorSvc: MonitorService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnInit(): void {
    this.lineHistoryTheme = {
      title: {
        text: `${this.metrics}.${this.metric}`,
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
              this.loadData('1d');
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
              this.loadData('1w');
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
              this.loadData('4w');
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
        trigger: 'axis',
        formatter: function (params: any) {
          let time: number = params[0].value[0];
          var date = new Date(time);
          let seriesName = params[0].seriesName;
          let month = (date.getMonth() + 1).toString().padStart(2, '0');
          let day = date.getDate().toString().padStart(2, '0');
          if (seriesName == null || seriesName == 'NULL') {
            return `${date.getFullYear()}/${month}/${day} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} -- ${
              params[0].value[1]
            }`;
          } else {
            return `${seriesName} ${date.getFullYear()}/${month}/${day} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} -- ${
              params[0].value[1]
            }`;
          }
        }
      },
      xAxis: {
        type: 'time',
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        boundaryGap: [0, '100%'],
        splitLine: {
          show: true
        }
      }
    };
    if (this.unit != undefined || this.unit != null) {
      // @ts-ignore
      this.lineHistoryTheme.title?.subtext = `${this.i18nSvc.fanyi('monitors.detail.chart.unit')}  ${this.unit}`;
    }
    this.loadData();
  }

  loadData(timePeriod?: string) {
    if (timePeriod != undefined) {
      this.timePeriod = timePeriod;
    }
    // 读取指标历史数据
    this.loading = true;
    let metricData$ = this.monitorSvc
      .getMonitorMetricHistoryData(this.monitorId, this.app, this.metrics, this.metric, this.timePeriod, false)
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
            if (legend.length > 1) {
              this.lineHistoryTheme.legend = {
                orient: 'vertical',
                align: 'auto',
                right: '10%',
                top: '10%',
                data: legend
              };
            }
            this.lineHistoryTheme.series = [];
            let maxLegend = 5;
            let valueKeyArr = Object.keys(values);
            for (let index = 0; index < valueKeyArr.length; index++) {
              if (maxLegend-- <= 0) {
                break;
              }
              let key = valueKeyArr[index];
              let seriesData: Array<{ value: any }> = [];
              values[key].forEach((item: { time: number; origin: any }) => {
                seriesData.push({
                  value: [item.time, item.origin]
                });
              });
              // @ts-ignore
              this.lineHistoryTheme.series.push({
                name: key,
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: seriesData
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
}
