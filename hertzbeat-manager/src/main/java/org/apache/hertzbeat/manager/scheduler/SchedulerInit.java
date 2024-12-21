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

package org.apache.hertzbeat.manager.scheduler;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.util.SdMonitorOperator;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

/**
 * scheduler init
 */
@Configuration
@Order(value = Ordered.LOWEST_PRECEDENCE - 1)
@Slf4j
public class SchedulerInit implements CommandLineRunner {
    
    @Autowired
    private CollectorScheduling collectorScheduling;
    
    @Autowired
    private CollectJobScheduling collectJobScheduling;
   
    private static final String MAIN_COLLECTOR_NODE_IP = "127.0.0.1";
    private static final String DEFAULT_COLLECTOR_VERSION = "DEBUG";

    @Autowired
    private AppService appService;
    
    @Autowired
    private MonitorDao monitorDao;
    
    @Autowired
    private ParamDao paramDao;
    
    @Autowired
    private CollectorDao collectorDao;
    
    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Autowired
    private MonitorBindDao monitorBindDao;
    
    @Override
    public void run(String... args) throws Exception {
        // init pre collector status
        List<Collector> collectors = collectorDao.findAll().stream()
                .peek(item -> item.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE))
                .collect(Collectors.toList());
        collectorDao.saveAll(collectors);
        // insert default consistent node
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name(CommonConstants.MAIN_COLLECTOR_NODE)
                .ip(MAIN_COLLECTOR_NODE_IP)
                .version(DEFAULT_COLLECTOR_VERSION)
                .build();
        collectorScheduling.collectorGoOnline(CommonConstants.MAIN_COLLECTOR_NODE, collectorInfo);
        // init jobs
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(List.of(CommonConstants.MONITOR_PAUSED_CODE));
        List<CollectorMonitorBind> monitorBinds = collectorMonitorBindDao.findAll();
        final Set<Long> sdMonitorIds = monitorBindDao.findAllByType(CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR).stream()
                .map(MonitorBind::getBizId)
                .collect(Collectors.toSet());
        Map<Long, String> monitorIdCollectorMap = monitorBinds.stream().collect(
                Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));
        for (Monitor monitor : monitors) {
            try {
                // build collect job entity
                Job appDefine = appService.getAppDefine(monitor.getApp());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                if (sdMonitorIds.contains(monitor.getId())) {
                    appDefine = SdMonitorOperator.constructSdJob(appDefine, SdMonitorOperator.getSdParam(params).get());
                }

                if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                    appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                }
                appDefine.setId(monitor.getJobId());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setDefaultInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());

                List<Configmap> configmaps = params.stream()
                        .map(param -> new Configmap(param.getField(), param.getParamValue(),
                                param.getType())).collect(Collectors.toList());
                List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.isNotBlank(item.getDefaultValue()))
                        .toList();
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), CommonConstants.TYPE_STRING);
                        configmaps.add(configmap);
                    }
                });
                appDefine.setConfigmap(configmaps);
                String collector = monitorIdCollectorMap.get(monitor.getId());
                long jobId = collectJobScheduling.addAsyncCollectJob(appDefine, collector);
                monitor.setJobId(jobId);
                monitorDao.save(monitor);
            } catch (Exception e) {
                log.error("init monitor job: {} error,continue next monitor", monitor, e);
            }
        }
    }
}
