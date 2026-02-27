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

import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { throwError } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { GrafanaDashboard } from '../../../pojo/GrafanaDashboard';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styleUrls: ['./monitor-detail.component.less']
})
export class MonitorDetailComponent implements OnInit, OnDestroy {
  constructor(
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  isSpinning: boolean = false;
  monitorId!: number;
  app!: string;
  monitor: Monitor = new Monitor();
  grafanaDashboard: GrafanaDashboard = new GrafanaDashboard();
  options: any;
  port: number | undefined;
  metrics!: string[];
  metricsInfo: any[] = [];
  chartMetrics: any[] = [];
  deadline = 90;
  countDownTime: number = 0;
  interval$!: any;
  whichTabIndex = 0;
  showBasic = true;

  // Lazy loading state for metrics list
  displayedMetrics: string[] = [];
  pageSize: number = 10;
  currentPage: number = 0;
  isLoadingMore: boolean = false;
  hasMoreMetrics: boolean = true;

  // Lazy loading state for chart metrics
  displayedChartMetrics: any[] = [];
  chartPageSize: number = 6;
  currentChartPage: number = 0;
  isLoadingMoreCharts: boolean = false;
  hasMoreCharts: boolean = true;

  favoriteMetricsSet: Set<string> = new Set();

  favoriteMetrics: any[] = [];
  favoriteChartMetrics: any[] = [];
  displayedFavoriteMetrics: any[] = [];
  displayedFavoriteChartMetrics: any[] = [];

  favoritePageSize: number = 6;
  favoriteChartPageSize: number = 6;
  hasMoreFavorites: boolean = true;
  hasMoreFavoriteCharts: boolean = true;
  isLoadingMoreFavorites: boolean = false;
  isLoadingMoreFavoriteCharts: boolean = false;

  favoriteTabIndex: number = 0;

  private io?: IntersectionObserver;
  private chartIo?: IntersectionObserver;
  private favoriteIo: IntersectionObserver | undefined;
  private favoriteChartIo: IntersectionObserver | undefined;

  ngOnInit(): void {
    this.countDownTime = this.deadline;
    this.loadRealTimeMetric();
    this.getGrafana();
    this.loadFavoriteMetricsFromBackend();
  }

  loadMetricChart() {
    this.isSpinning = true;
    this.showBasic = false;
    this.whichTabIndex = 1;
    // detect if historical data service is available
    const detectStatus$ = this.monitorSvc
      .getWarehouseStorageServerStatus()
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code == 0) {
            // Filter the numerical metrics that can be aggregated under this monitor
            if (this.app == 'push') {
              return this.appDefineSvc.getPushDefine(this.monitorId);
            } else if (this.app == 'prometheus') {
              return this.appDefineSvc.getAppDynamicDefine(this.monitorId);
            } else {
              return this.appDefineSvc.getAppDefine(this.app);
            }
          } else {
            // historical data service is unavailable
            return throwError(message.msg);
          }
        })
      )
      .pipe(
        finalize(() => {
          detectStatus$.unsubscribe();
          this.isSpinning = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data != undefined) {
            this.chartMetrics = [];
            let metrics = message.data.metrics;
            metrics.forEach((metric: { name: any; fields: any; visible: boolean }) => {
              let fields = metric.fields;
              if (fields != undefined && metric.visible) {
                fields.forEach((field: { type: number; field: any; unit: any }) => {
                  if (field.type == 0) {
                    this.chartMetrics.push({
                      metrics: metric.name,
                      metric: field.field,
                      unit: field.unit
                    });
                  }
                });
              }
            });
            this.loadInitialCharts();
            this.setupChartIntersectionObserver();
            this.cdr.detectChanges();
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitor.detail.time-series.unavailable'), error);
        }
      );
  }

  loadRealTimeMetric() {
    this.whichTabIndex = 0;
    this.isSpinning = true;
    this.route.paramMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.isSpinning = true;
          let id = paramMap.get('monitorId');
          this.monitorId = Number(id);
          return this.monitorSvc.getMonitor(this.monitorId);
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.monitor = message.data.monitor;
            this.app = this.monitor?.app;
            if (this.monitor.scrape && this.monitor.scrape != 'static') {
              this.app = this.monitor.scrape;
            }
            let params: Param[] = message.data.params;
            params.forEach(param => {
              if (param.field === 'port') {
                this.port = Number(param.paramValue);
              }
            });
            this.metrics = [];
            this.displayedMetrics = [];
            this.currentPage = 0;
            this.hasMoreMetrics = true;
            this.isLoadingMore = false;
            this.displayedChartMetrics = [];
            this.currentChartPage = 0;
            this.hasMoreCharts = true;
            this.isLoadingMoreCharts = false;

            this.metricsInfo = message.data.metrics || [];
            this.metrics = this.metricsInfo.map((metric: any) => metric.name);

            setTimeout(() => {
              this.cdr.detectChanges();
              if (this.metrics && this.metrics.length > 0) {
                this.loadInitialMetrics();
                this.setupIntersectionObserver();
              }
            }, 0);
          } else {
            console.warn(message.msg);
          }
          if (this.interval$ === undefined) {
            this.interval$ = setInterval(this.countDown.bind(this), 1000);
          }
          this.isSpinning = false;
        },
        error => {
          this.isSpinning = false;
          console.error(error.msg);
        }
      );
  }

  private loadInitialCharts(): void {
    const end = Math.min(this.chartPageSize, this.chartMetrics?.length || 0);
    this.displayedChartMetrics = (this.chartMetrics || []).slice(0, end);
    this.currentChartPage = 1;
    this.hasMoreCharts = end < (this.chartMetrics?.length || 0);
    this.cdr.detectChanges();
  }

  private loadMoreCharts(): void {
    if (this.isLoadingMoreCharts || !this.hasMoreCharts) return;
    this.isLoadingMoreCharts = true;
    const start = this.currentChartPage * this.chartPageSize;
    const end = Math.min(start + this.chartPageSize, this.chartMetrics.length);
    const nextChunk = this.chartMetrics.slice(start, end);
    this.displayedChartMetrics = this.displayedChartMetrics.concat(nextChunk);
    this.currentChartPage++;
    this.hasMoreCharts = end < this.chartMetrics.length;
    this.isLoadingMoreCharts = false;
    this.cdr.detectChanges();
  }

  private setupChartIntersectionObserver(): void {
    if (this.chartIo) {
      this.chartIo.disconnect();
      this.chartIo = undefined;
    }

    setTimeout(() => {
      this.initChartObserver();
    }, 0);
  }

  private setupFavoriteObserver(type: 'metrics' | 'charts') {
    const isMetrics = type === 'metrics';
    const observer = isMetrics ? this.favoriteIo : this.favoriteChartIo;
    const selector = isMetrics ? '#favoriteMetricsLoadSentinel' : '#favoriteChartsLoadSentinel';
    const hasMore = isMetrics ? this.hasMoreFavorites : this.hasMoreFavoriteCharts;
    const isLoading = isMetrics ? this.isLoadingMoreFavorites : this.isLoadingMoreFavoriteCharts;
    const loadMore = isMetrics ? () => this.loadMoreFavorites() : () => this.loadMoreFavoriteCharts();

    if (observer) {
      observer.disconnect();
    }

    setTimeout(() => {
      const sentinel = document.querySelector(selector);
      if (sentinel) {
        const newObserver = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting && hasMore && !isLoading) {
                loadMore();
              }
            });
          },
          { threshold: 0.1 }
        );

        if (isMetrics) {
          this.favoriteIo = newObserver;
        } else {
          this.favoriteChartIo = newObserver;
        }

        newObserver.observe(sentinel);
      }
    }, 100);
  }

  loadMoreFavorites() {
    if (this.isLoadingMoreFavorites || !this.hasMoreFavorites) return;
    this.isLoadingMoreFavorites = true;
    const start = this.displayedFavoriteMetrics.length;
    const end = Math.min(start + this.favoritePageSize, this.favoriteMetrics.length);
    const nextChunk = this.favoriteMetrics.slice(start, end);
    this.displayedFavoriteMetrics = this.displayedFavoriteMetrics.concat(nextChunk);
    this.hasMoreFavorites = end < this.favoriteMetrics.length;
    this.isLoadingMoreFavorites = false;
    this.cdr.detectChanges();
  }

  loadMoreFavoriteCharts() {
    if (this.isLoadingMoreFavoriteCharts || !this.hasMoreFavoriteCharts) return;
    this.isLoadingMoreFavoriteCharts = true;
    const start = this.displayedFavoriteChartMetrics.length;
    const end = Math.min(start + this.favoriteChartPageSize, this.favoriteChartMetrics.length);
    const nextChunk = this.favoriteChartMetrics.slice(start, end);
    this.displayedFavoriteChartMetrics = this.displayedFavoriteChartMetrics.concat(nextChunk);
    this.hasMoreFavoriteCharts = end < this.favoriteChartMetrics.length;
    this.isLoadingMoreFavoriteCharts = false;
    this.cdr.detectChanges();
  }

  private initChartObserver(retryCount: number = 0): void {
    const maxRetries = 3;
    const sentinel = document.getElementById('charts-load-sentinel');

    if (!sentinel) {
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.initChartObserver(retryCount + 1);
        }, 100 * (retryCount + 1));
      }
      return;
    }

    try {
      this.chartIo = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting && !this.isLoadingMoreCharts) {
              this.loadMoreCharts();
            }
          }
        },
        {
          root: null,
          rootMargin: '200px 0px 200px 0px',
          threshold: 0.01
        }
      );

      this.chartIo.observe(sentinel);
    } catch (error) {
      console.error('Failed to setup chart intersection observer:', error);
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.initChartObserver(retryCount + 1);
        }, 200 * (retryCount + 1));
      }
    }
  }

  private loadInitialMetrics(): void {
    const end = Math.min(this.pageSize, this.metrics?.length || 0);
    this.displayedMetrics = (this.metrics || []).slice(0, end);
    this.currentPage = 1;
    this.hasMoreMetrics = end < (this.metrics?.length || 0);
    this.cdr.detectChanges();
  }

  private loadMoreMetrics(): void {
    if (this.isLoadingMore || !this.hasMoreMetrics) return;
    this.isLoadingMore = true;
    const start = this.currentPage * this.pageSize;
    const end = Math.min(start + this.pageSize, this.metrics.length);
    const nextChunk = this.metrics.slice(start, end);
    this.displayedMetrics = this.displayedMetrics.concat(nextChunk);
    this.currentPage++;
    this.hasMoreMetrics = end < this.metrics.length;
    this.isLoadingMore = false;
    this.cdr.detectChanges();
  }

  private setupIntersectionObserver(): void {
    if (this.io) {
      this.io.disconnect();
      this.io = undefined;
    }

    setTimeout(() => {
      this.initMetricsObserver();
    }, 0);
  }

  private initMetricsObserver(retryCount: number = 0): void {
    const maxRetries = 3;
    const sentinel = document.getElementById('metrics-load-sentinel');

    if (!sentinel) {
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.initMetricsObserver(retryCount + 1);
        }, 100 * (retryCount + 1));
      }
      return;
    }

    try {
      this.io = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting && !this.isLoadingMore) {
              this.loadMoreMetrics();
            }
          }
        },
        {
          root: null,
          rootMargin: '200px 0px 200px 0px',
          threshold: 0.01
        }
      );

      this.io.observe(sentinel);
    } catch (error) {
      console.error('Failed to setup metrics intersection observer:', error);
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.initMetricsObserver(retryCount + 1);
        }, 200 * (retryCount + 1));
      }
    }
  }

  countDown() {
    if (this.deadline > 0) {
      this.countDownTime = Math.max(0, this.countDownTime - 1);
      this.cdr.detectChanges();
      if (this.countDownTime == 0) {
        if (this.whichTabIndex == 1) {
          this.loadMetricChart();
        } else if (this.whichTabIndex == 2) {
          this.loadFavoriteMetrics();
        } else {
          this.loadRealTimeMetric();
        }
        this.countDownTime = this.deadline;
        this.cdr.detectChanges();
      }
    }
  }

  refreshMetrics() {
    if (this.whichTabIndex == 1) {
      this.loadMetricChart();
    } else if (this.whichTabIndex == 2) {
      this.loadFavoriteMetrics();
    } else {
      this.loadRealTimeMetric();
    }
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  configRefreshDeadline(deadlineTime: number) {
    this.deadline = deadlineTime;
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  getGrafana() {
    this.monitorSvc.getGrafanaDashboard(this.monitorId).subscribe(
      message => {
        if (message.code === 0 && message.data != null) {
          this.grafanaDashboard = message.data;
        }
      },
      error => {
        console.error(error.msg);
      }
    );
  }

  loadFavoriteMetrics() {
    this.whichTabIndex = 2;

    this.favoriteMetrics = [];
    this.favoriteChartMetrics = [];
    this.displayedFavoriteMetrics = [];
    this.displayedFavoriteChartMetrics = [];
    this.hasMoreFavorites = false;
    this.hasMoreFavoriteCharts = false;

    if (this.favoriteMetricsSet.size === 0) {
      return;
    }
    setTimeout(() => {
      // Convert favorites indicator to array
      this.favoriteMetrics = Array.from(this.favoriteMetricsSet);
      this.displayedFavoriteMetrics = this.favoriteMetrics.slice(0, this.favoritePageSize);
      this.hasMoreFavorites = this.favoriteMetrics.length > this.favoritePageSize;
      this.cdr.detectChanges();
    }, 0);

    this.loadFavoriteChartDefinitions();

    setTimeout(() => this.onFavoriteTabChange(this.favoriteTabIndex), 100);
  }

  private loadFavoriteChartDefinitions() {
    // Chart definition for the independent request collection metric, completely decoupled from the History tab
    const favoriteMetricsList = Array.from(this.favoriteMetricsSet);

    this.monitorSvc
      .getWarehouseStorageServerStatus()
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code == 0) {
            if (this.app == 'push') {
              return this.appDefineSvc.getPushDefine(this.monitorId);
            } else if (this.app == 'prometheus') {
              return this.appDefineSvc.getAppDynamicDefine(this.monitorId);
            } else {
              return this.appDefineSvc.getAppDefine(this.app);
            }
          } else {
            return throwError(message.msg);
          }
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data != undefined) {
            this.favoriteChartMetrics = [];
            let metrics = message.data.metrics;

            metrics.forEach((metric: { name: any; fields: any; visible: boolean }) => {
              let fields = metric.fields;
              if (fields != undefined && metric.visible) {
                fields.forEach((field: { type: number; field: any; unit: any }) => {
                  if (field.type == 0) {
                    const fullPath = `${metric.name}.${field.field}`;
                    if (
                      favoriteMetricsList.includes(fullPath) ||
                      favoriteMetricsList.includes(metric.name) ||
                      favoriteMetricsList.includes(field.field)
                    ) {
                      this.favoriteChartMetrics.push({
                        metrics: metric.name,
                        metric: field.field,
                        unit: field.unit
                      });
                    }
                  }
                });
              }
            });

            this.displayedFavoriteChartMetrics = this.favoriteChartMetrics.slice(0, this.favoriteChartPageSize);
            this.hasMoreFavoriteCharts = this.favoriteChartMetrics.length > this.favoriteChartPageSize;
          }
        },
        error => {
          console.warn('Failed to load favorite chart definitions:', error);
        }
      );
  }

  onFavoriteTabChange(index: number) {
    this.favoriteTabIndex = index;
    if (index === 0) {
      this.setupFavoriteObserver('metrics');
    } else if (index === 1) {
      this.setupFavoriteObserver('charts');
    }
  }

  toggleFavorite(metric: string) {
    if (this.favoriteMetricsSet.has(metric)) {
      this.removeFavoriteMetric(metric);
    } else {
      this.addFavoriteMetric(metric);
    }
  }

  private addFavoriteMetric(metric: string) {
    this.monitorSvc.addMetricsFavorite(this.monitorId, metric).subscribe(
      message => {
        if (message.code === 0) {
          this.favoriteMetricsSet.add(metric);
          this.notifySvc.success(this.i18nSvc.fanyi('monitor.favorite.add.success'), '');
          if (this.whichTabIndex === 2) {
            this.loadFavoriteMetrics();
          }
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitor.favorite.add.failed'), message.msg || '');
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('monitor.favorite.add.failed'), error.message || '');
      }
    );
  }

  private removeFavoriteMetric(metric: string) {
    this.monitorSvc.removeMetricsFavorite(this.monitorId, metric).subscribe(
      message => {
        if (message.code === 0) {
          this.favoriteMetricsSet.delete(metric);
          this.notifySvc.success(this.i18nSvc.fanyi('monitor.favorite.remove.success'), '');
          if (this.whichTabIndex === 2) {
            this.loadFavoriteMetrics();
          }
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitor.favorite.remove.failed'), message.msg || '');
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('monitor.favorite.remove.failed'), error.message || '');
      }
    );
  }

  private loadFavoriteMetricsFromBackend() {
    this.monitorSvc.getUserFavoritedMetrics(this.monitorId).subscribe(
      message => {
        if (message.code === 0 && message.data) {
          const favoritedMetrics = Array.isArray(message.data) ? message.data : Array.from(message.data);
          favoritedMetrics.forEach(metric => {
            this.favoriteMetricsSet.add(metric);
          });
        }
      },
      error => {}
    );
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
      this.interval$ = undefined;
    }

    if (this.io) {
      try {
        this.io.disconnect();
      } catch (error) {
        console.warn('Error disconnecting metrics observer:', error);
      } finally {
        this.io = undefined;
      }
    }

    if (this.chartIo) {
      try {
        this.chartIo.disconnect();
      } catch (error) {
        console.warn('Error disconnecting chart observer:', error);
      } finally {
        this.chartIo = undefined;
      }
    }

    if (this.favoriteIo) {
      try {
        this.favoriteIo.disconnect();
      } catch (error) {
        console.warn('Error disconnecting favorite metrics observer:', error);
      } finally {
        this.favoriteIo = undefined;
      }
    }

    if (this.favoriteChartIo) {
      try {
        this.favoriteChartIo.disconnect();
      } catch (error) {
        console.warn('Error disconnecting favorite chart observer:', error);
      } finally {
        this.favoriteChartIo = undefined;
      }
    }

    this.isLoadingMore = false;
    this.isLoadingMoreCharts = false;
    this.isLoadingMoreFavorites = false;
    this.isLoadingMoreFavoriteCharts = false;
    this.isSpinning = false;

    this.displayedMetrics = [];
    this.displayedChartMetrics = [];
    this.displayedFavoriteMetrics = [];
    this.displayedFavoriteChartMetrics = [];
    this.metrics = [];
    this.chartMetrics = [];
    this.favoriteMetrics = [];
    this.favoriteChartMetrics = [];
    this.favoriteMetricsSet.clear();
  }
}
