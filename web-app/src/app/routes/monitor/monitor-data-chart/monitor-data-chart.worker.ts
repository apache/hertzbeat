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

import { EChartsOption } from 'echarts';
import { Observable } from 'rxjs';

type WorkerParam = {
  values: Record<string, any>;
  isInterval?: boolean;
  palette?: string[];
};

type WorkerResult = {
  data?: EChartsOption;
  progress: number;
};
// Create an Observable that executes in the Worker
function createWorker(data: WorkerParam): Observable<WorkerResult> {
  return new Observable<WorkerResult>(subscriber => {
    const worker = new Worker(fn2workerURL(), { name: 'xxxxx' });

    // Send data to the worker
    worker.postMessage(data);

    // Listen to Worker messages
    const messageHandler = (event: MessageEvent<WorkerResult>) => {
      subscriber.next(event.data);
      if (event.data.progress === 100) {
        subscriber.complete();
      }
    };

    const errorHandler = (error: ErrorEvent) => {
      subscriber.error(error);
    };

    worker.addEventListener('message', messageHandler);
    worker.addEventListener('error', errorHandler);

    // Cleanup
    return () => {
      worker.removeEventListener('message', messageHandler);
      worker.removeEventListener('error', errorHandler);
      worker.terminate();
    };
  });
}
function fn2workerURL() {
  const blob = new Blob([`(${workerFun.toString()})()`], { type: 'text/javascript' });
  return URL.createObjectURL(blob);
}

const workerFun = () => {
  onmessage = (event: MessageEvent<WorkerParam>) => {
    const result = processingData(event.data);
    postMessage({ data: result, progress: 100 });
  };

  const processingData = (param: WorkerParam): EChartsOption => {
    const { values, isInterval } = param;
    const lineHistoryTheme: EChartsOption = {};
    const palette = param.palette && param.palette.length > 0 ? param.palette : ['#5b8cff', '#1fbf9f', '#f59f3a', '#f25f5c'];
    let legend: string[] = [];
    Object.keys(values).forEach(key => {
      legend.push(key);
    });
    if (!isInterval || legend.length > 1) {
      if (legend.length > 1) {
        lineHistoryTheme.legend = {
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
      lineHistoryTheme.series = [];
      let valueKeyArr = Object.keys(values);
      for (let index = 0; index < valueKeyArr.length; index++) {
        let key = valueKeyArr[index];
        let seriesData: Array<{ value: any }> = [];
        values[key].forEach((item: { time: number; origin: any }) => {
          seriesData.push({
            value: [item.time, item.origin]
          });
        });

        const seriesColor = palette[index % palette.length];

        lineHistoryTheme.series.push({
          name: key,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: seriesColor,
            width: valueKeyArr.length === 1 ? 2.6 : 2.2
          },
          itemStyle: {
            color: seriesColor
          },
          areaStyle: valueKeyArr.length === 1
            ? {
                opacity: 0.14,
                color: seriesColor
              }
            : undefined,
          color: seriesColor,
          z: valueKeyArr.length === 1 ? 3 : 2,
          zlevel: 0,
          symbol: 'none',
          sampling: 'lttb',
          animation: false,
          connectNulls: true,
          triggerLineEvent: true,
          silent: false,
          endLabel: valueKeyArr.length === 1
            ? {
                show: true,
                color: seriesColor
              }
            : undefined,
          emphasis: {
            focus: 'series'
          },
          data: seriesData
        });
      }
    } else {
      legend = ['Max', 'Min', 'Mean'];
      lineHistoryTheme.legend = {
        orient: 'vertical',
        align: 'auto',
        right: '10%',
        top: '10%',
        data: legend
      };
      let maxSeriesData: Array<{ value: any }> = [];
      let minSeriesData: Array<{ value: any }> = [];
      let meanSeriesData: Array<{ value: any }> = [];
      lineHistoryTheme.series = [];
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
      lineHistoryTheme.series.push({
        name: 'Max',
        type: 'line',
        smooth: true,
        showSymbol: false,
        emphasis: {
          focus: 'series'
        },
        lineStyle: { color: palette[0], width: 2.2 },
        itemStyle: { color: palette[0] },
        color: palette[0],
        data: maxSeriesData
      });
      lineHistoryTheme.series.push({
        name: 'Min',
        type: 'line',
        smooth: true,
        showSymbol: false,
        emphasis: {
          focus: 'series'
        },
        lineStyle: { color: palette[1] || palette[0], width: 2.2 },
        itemStyle: { color: palette[1] || palette[0] },
        color: palette[1] || palette[0],
        data: minSeriesData
      });
      lineHistoryTheme.series.push({
        name: 'Mean',
        type: 'line',
        smooth: true,
        showSymbol: false,
        emphasis: {
          focus: 'series'
        },
        lineStyle: { color: palette[2] || palette[0], width: 2.2 },
        itemStyle: { color: palette[2] || palette[0] },
        color: palette[2] || palette[0],
        data: meanSeriesData
      });
    }
    return lineHistoryTheme;
  };
};

export { createWorker, WorkerResult };
