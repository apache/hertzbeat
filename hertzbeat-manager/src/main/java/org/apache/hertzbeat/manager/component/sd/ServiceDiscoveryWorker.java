/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.component.sd;

import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.SdMonitorParam;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.SdMonitorOperator;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.ManagerWorkerPool;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

/**
 * Service Discovery Worker
 */
@Slf4j
@Component
public class ServiceDiscoveryWorker implements InitializingBean {
    private final MonitorService monitorService;
    private final ParamDao paramDao;
    private final MonitorDao monitorDao;
    private final MonitorBindDao monitorBindDao;
    private final CollectorMonitorBindDao collectorMonitorBindDao;
    private final CommonDataQueue dataQueue;
    private final ManagerWorkerPool workerPool;

    public ServiceDiscoveryWorker(MonitorService monitorService, ParamDao paramDao, MonitorDao monitorDao,
                                  MonitorBindDao monitorBindDao, CollectorMonitorBindDao collectorMonitorBindDao,
                                  CommonDataQueue dataQueue, ManagerWorkerPool workerPool) {
        this.monitorService = monitorService;
        this.paramDao = paramDao;
        this.monitorDao = monitorDao;
        this.monitorBindDao = monitorBindDao;
        this.collectorMonitorBindDao = collectorMonitorBindDao;
        this.dataQueue = dataQueue;
        this.workerPool = workerPool;
    }

    @Override
    public void afterPropertiesSet() {
        workerPool.executeJob(new SdUpdateTask());
    }

    private class SdUpdateTask implements Runnable {
        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try (final CollectRep.MetricsData metricsData = dataQueue.pollServiceDiscoveryData()) {

                    Long monitorId = metricsData.getId();
                    final Monitor mainMonitor = monitorDao.findMonitorsByIdIn(Sets.newHashSet(monitorId)).get(0);
                    mainMonitor.getLabels().remove(CommonConstants.TAG_SD_MAIN_MONITOR);
                    // collector
                    final Optional<CollectorMonitorBind> collectorBind = collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(mainMonitor.getId());
                    String collector = collectorBind.map(CollectorMonitorBind::getCollector).orElse(null);
                    // param
                    List<Param> mainMonitorParamList = paramDao.findParamsByMonitorId(mainMonitor.getId());
                    mainMonitorParamList = SdMonitorOperator.removeSdParam(mainMonitorParamList);

                    final Set<Long> subMonitorIdSet = monitorBindDao.findMonitorBindByBizIdAndType(monitorId, CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR)
                            .stream()
                            .map(MonitorBind::getMonitorId)
                            .collect(Collectors.toSet());
                    final Map<String, List<Monitor>> hostMonitorMap = CollectionUtils.isEmpty(subMonitorIdSet)
                            ? Maps.newHashMap()
                            : monitorDao.findMonitorsByIdIn(subMonitorIdSet).stream().collect(Collectors.groupingBy(Monitor::getHost));

                    RowWrapper rowWrapper = metricsData.readRow();

                    while (rowWrapper.hasNextRow()) {
                        rowWrapper = rowWrapper.nextRow();


                        final String host = rowWrapper.nextCell().getValue();
                        final String port = rowWrapper.nextCell().getValue();
                        final List<Monitor> monitorList = hostMonitorMap.get(host);
                        if (CollectionUtils.isEmpty(monitorList)) {
                            monitorService.addAndSaveMonitorJob(mainMonitor.clone(), SdMonitorOperator.cloneParamList(mainMonitorParamList), collector,
                                    SdMonitorParam.builder()
                                            .detectedHost(host)
                                            .detectedPort(port)
                                            .bizId(mainMonitor.getId())
                                            .build(), null);
                            return;
                        }

                        for (Monitor monitor : monitorList) {
                            // make sure monitor that has the same host and port is not existed.
                            final Optional<Param> samePortParam = paramDao.findParamsByMonitorId(monitor.getId()).stream()
                                    .filter(param -> StringUtils.equals(param.getField(), "port"))
                                    .filter(param -> StringUtils.equals(param.getParamValue(), port))
                                    .findFirst();
                            if (samePortParam.isEmpty()) {
                                monitorService.addAndSaveMonitorJob(mainMonitor.clone(), SdMonitorOperator.cloneParamList(mainMonitorParamList), collector,
                                        SdMonitorParam.builder()
                                                .detectedHost(host)
                                                .detectedPort(port)
                                                .bizId(mainMonitor.getId())
                                                .build(), null);
                            } else {
                                monitorService.enableManageMonitors(Sets.newHashSet(monitor.getId()));
                            }
                        }

                        // make sure hostMonitorMap contains monitors that have not judged yet.
                        hostMonitorMap.remove(host);
                    }

                    // hostMonitorMap only contains monitors which are already existed but not in service discovery data
                    // due to monitors that coincide with service discovery data are removed.
                    // Thus, all monitors still in hostMonitorMap need to be cancelled.
                    final HashSet<Long> needCancelMonitorIdSet = Sets.newHashSet();
                    hostMonitorMap.forEach((key, value) -> needCancelMonitorIdSet.addAll(value.stream()
                            .map(Monitor::getId)
                            .collect(Collectors.toSet())));
                    monitorService.cancelManageMonitors(needCancelMonitorIdSet);
                } catch (Exception exception) {
                    log.error(exception.getMessage(), exception);
                }
            }
        }
    }
}
