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
import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.ManagerWorkerPool;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * Service Discovery Worker
 */
@Slf4j
@Component
public class ServiceDiscoveryWorker implements InitializingBean {

    private static final String FILED_HOST = "host";
    private static final String FILED_PORT = "port";
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
                    final Monitor mainMonitor = monitorDao.findById(monitorId).orElse(null);
                    if (mainMonitor == null) {
                        log.warn("No monitor found for id {}", monitorId);
                        continue;
                    }
                    // collector
                    final Optional<CollectorMonitorBind> collectorBind = collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitorId);
                    String collector = collectorBind.map(CollectorMonitorBind::getCollector).orElse(null);
                    // params
                    List<Param> mainMonitorParams = paramDao.findParamsByMonitorId(monitorId);
                    final Map<String, MonitorBind> subMonitorBindMap = monitorBindDao.findMonitorBindsByBizId(monitorId)
                            .stream().collect(Collectors.toMap(MonitorBind::getKeyStr, item -> item));
                    RowWrapper rowWrapper = metricsData.readRow();
                    Map<String, String> fieldsValue = Maps.newHashMapWithExpectedSize(8);
                    String defaultPort = mainMonitorParams.stream()
                            .filter(param -> FILED_PORT.equals(param.getField()))
                            .findFirst()
                            .map(Param::getParamValue)
                            .orElse("");
                    while (rowWrapper.hasNextRow()) {
                        rowWrapper = rowWrapper.nextRow();
                        fieldsValue.clear();
                        rowWrapper.cellStream().forEach(cell -> {
                            String value = cell.getValue();
                            fieldsValue.put(cell.getField().getName(), value);
                        });
                        final String host = fieldsValue.get(FILED_HOST);
                        final String port = fieldsValue.getOrDefault(FILED_PORT, defaultPort);
                        final String keyStr = host + ":" + port;
                        if (subMonitorBindMap.containsKey(keyStr)) {
                            subMonitorBindMap.remove(keyStr);
                            continue;
                        }
                        Monitor newMonitor = mainMonitor.clone();
                        newMonitor.setId(null);
                        newMonitor.setHost(host);
                        newMonitor.setName(newMonitor.getName() + "-" + host + ":" + port);
                        newMonitor.setScrape(CommonConstants.SCRAPE_STATIC);
                        newMonitor.setGmtCreate(LocalDateTime.now());
                        newMonitor.setGmtUpdate(LocalDateTime.now());
                        // replace host port
                        List<Param> newParams = new LinkedList<>();
                        for (Param param : mainMonitorParams) {
                            Param newParam = param.clone();
                            newParam.setId(null);
                            newParam.setGmtUpdate(null);
                            newParam.setGmtCreate(null);
                            if (FILED_HOST.equals(newParam.getField())) {
                                newParam.setParamValue(host);
                            } else if (FILED_PORT.equals(newParam.getField())) {
                                newParam.setParamValue(port);
                            }
                            newParams.add(newParam);
                        }
                        monitorService.addMonitor(newMonitor, newParams, collector, null);
                        MonitorBind monitorBind = MonitorBind.builder()
                                .bizId(monitorId)
                                .monitorId(newMonitor.getId())
                                .keyStr(keyStr)
                                .build();
                        monitorBindDao.save(monitorBind);
                    }
                    // hostMonitorMap only contains monitors which are already existed but not in service discovery data
                    // due to monitors that coincide with service discovery data are removed.
                    // Thus, all monitors still in hostMonitorMap need to be cancelled.
                    final Set<Long> needCancelMonitorIdSet = subMonitorBindMap.values().stream()
                            .map(MonitorBind::getMonitorId).collect(Collectors.toSet());
                    monitorService.deleteMonitors(needCancelMonitorIdSet);
                } catch (Exception exception) {
                    log.error(exception.getMessage(), exception);
                }
            }
        }
    }
}
