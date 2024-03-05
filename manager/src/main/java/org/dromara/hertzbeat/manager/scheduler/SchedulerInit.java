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

package org.dromara.hertzbeat.manager.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.manager.*;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.service.AppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * scheduler init
 *
 * @author tom
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
                                              .build();
        collectorScheduling.collectorGoOnline(CommonConstants.MAIN_COLLECTOR_NODE, collectorInfo);
        // init jobs
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(List.of((byte) 0));
        List<CollectorMonitorBind> monitorBinds = collectorMonitorBindDao.findAll();
        Map<Long, String> monitorIdCollectorMap = monitorBinds.stream().collect(
                Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));
        for (Monitor monitor : monitors) {
            try {
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                    appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                }
                appDefine.setId(monitor.getJobId());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream()
                        .map(param -> new Configmap(param.getField(), param.getValue(),
                                param.getType())).collect(Collectors.toList());
                List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.hasText(item.getDefaultValue()))
                        .collect(Collectors.toList());
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        // todo type
                        Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
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
