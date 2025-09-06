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


package org.apache.hertzbeat.ai.agent.adapters.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

/**
 * Implementation of the MonitorServiceAdapter interface that provides access to monitor information
 * through reflection by invoking the underlying monitor service implementation.
 */
@Slf4j
@Component
public class MonitorServiceAdapterImpl implements MonitorServiceAdapter {

    @Override
    public Page<Monitor> getMonitors(
            List<Long> ids,
            String app,
            String search,
            Byte status,
            String sort,
            String order,
            Integer pageIndex,
            Integer pageSize,
            String labels) {
        try {
            // Provide default values for all nullable parameters
            if (sort == null || sort.trim().isEmpty()) {
                sort = "gmtCreate";
            }
            if (order == null || order.trim().isEmpty()) {
                order = "desc";
            }
            if (pageIndex == null) {
                pageIndex = 0;
            }
            if (pageSize == null) {
                pageSize = 8;
            }

            Object monitorService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject: {}", subjectSum);

            try {
                monitorService = SpringContextHolder.getBean("monitorServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'monitorServiceImpl', trying by class name");
            }

            assert monitorService != null;
            log.debug("MonitorService bean found: {}", monitorService.getClass().getSimpleName());
            Method method = monitorService.getClass().getMethod(
                    "getMonitors",
                    List.class, String.class, String.class, Byte.class,
                    String.class, String.class, int.class, int.class, String.class);


            @SuppressWarnings("unchecked")
            Page<Monitor> result = (Page<Monitor>) method.invoke(
                    monitorService,
                    ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            log.debug("MonitorServiceAdapter.getMonitors result: {}", result.getContent());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getMonitors", e);
        } catch (Exception e) {
            log.debug("Failed to invoke getMonitors via adapter", e);
            throw new RuntimeException("Failed to invoke getMonitors via adapter", e);
        }
    }

    @Override
    public Long addMonitor(Monitor monitor, List<Param> params, String collector) {
        try {
            Object monitorService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for addMonitor: {}", subjectSum);

            try {
                monitorService = SpringContextHolder.getBean("monitorServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'monitorServiceImpl', trying by class name");
            }

            assert monitorService != null;
            log.debug("MonitorService bean found for addMonitor: {}", monitorService.getClass().getSimpleName());

            // Call addMonitor method: addMonitor(Monitor monitor, List<Param> params, String collector, GrafanaDashboard dashboard)
            Method method = monitorService.getClass().getMethod(
                    "addMonitor",
                    Monitor.class, List.class, String.class,
                    Class.forName("org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard"));

            // Call the method with null dashboard
            method.invoke(monitorService, monitor, params, collector, null);

            log.debug("Successfully added monitor: {} with ID: {}", monitor.getName(), monitor.getId());
            return monitor.getId();

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: addMonitor", e);
        } catch (Exception e) {
            log.error("Failed to invoke addMonitor via adapter", e);
            throw new RuntimeException("Failed to invoke addMonitor via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, String> getAvailableMonitorTypes(String language) {
        try {
            Object appService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAvailableMonitorTypes: {}", subjectSum);

            try {
                appService = SpringContextHolder.getBean("appServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'appServiceImpl', trying by class name");
            }

            assert appService != null;
            log.debug("AppService bean found for getAvailableMonitorTypes: {}", appService.getClass().getSimpleName());

            // Provide default language if not specified
            if (language == null || language.trim().isEmpty()) {
                language = "en-US";
            }

            // Call getI18nApps method: getI18nApps(String lang)
            Method method = appService.getClass().getMethod("getI18nApps", String.class);

            @SuppressWarnings("unchecked")
            Map<String, String> result = (Map<String, String>) method.invoke(appService, language);

            log.debug("Successfully retrieved {} monitor types", result.size());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getI18nApps", e);
        } catch (Exception e) {
            log.error("Failed to invoke getI18nApps via adapter", e);
            throw new RuntimeException("Failed to invoke getI18nApps via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public List<ParamDefine> getMonitorParamDefines(String app) {
        try {
            Object appService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMonitorParamDefines: {}", subjectSum);

            try {
                appService = SpringContextHolder.getBean("appServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'appServiceImpl', trying by class name");
            }

            assert appService != null;
            log.debug("AppService bean found for getMonitorParamDefines: {}", appService.getClass().getSimpleName());

            // Validate app parameter
            if (app == null || app.trim().isEmpty()) {
                throw new IllegalArgumentException("Monitor type/app parameter is required");
            }

            // Call getAppParamDefines method: getAppParamDefines(String app)
            Method method = appService.getClass().getMethod("getAppParamDefines", String.class);

            @SuppressWarnings("unchecked")
            List<ParamDefine> result = (List<ParamDefine>) method.invoke(appService, app.toLowerCase().trim());

            log.debug("Successfully retrieved {} parameter definitions for monitor type: {}", result.size(), app);
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getAppParamDefines", e);
        } catch (Exception e) {
            log.error("Failed to invoke getAppParamDefines via adapter for app: {}", app, e);
            throw new RuntimeException("Failed to invoke getAppParamDefines via adapter: " + e.getMessage(), e);
        }
    }
}