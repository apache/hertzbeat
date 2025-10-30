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


package org.apache.hertzbeat.ai.adapters.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Implementation of the MonitorServiceAdapter interface that provides access to monitor information
 * through direct service injection instead of reflection.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MonitorServiceAdapterImpl implements MonitorServiceAdapter {

    private final MonitorService monitorService;
    private final AppService appService;

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

            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject: {}", subjectSum);

            Page<Monitor> result = monitorService.getMonitors(
                    ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            
            log.debug("MonitorServiceAdapter.getMonitors result: {}", result.getContent());
            return result;

        } catch (Exception e) {
            log.debug("Failed to invoke getMonitors via adapter", e);
            throw new RuntimeException("Failed to invoke getMonitors via adapter", e);
        }
    }

    @Override
    public Long addMonitor(Monitor monitor, List<Param> params, String collector) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for addMonitor: {}", subjectSum);

            // Call addMonitor method with null dashboard
            monitorService.addMonitor(monitor, params, collector, (GrafanaDashboard) null);

            log.debug("Successfully added monitor: {} with ID: {}", monitor.getName(), monitor.getId());
            return monitor.getId();

        } catch (Exception e) {
            log.error("Failed to invoke addMonitor via adapter", e);
            throw new RuntimeException("Failed to invoke addMonitor via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, String> getAvailableMonitorTypes(String language) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAvailableMonitorTypes: {}", subjectSum);

            // Provide default language if not specified
            if (language == null || language.trim().isEmpty()) {
                language = "en-US";
            }

            // Call getI18nApps method directly
            Map<String, String> result = appService.getI18nApps(language);

            log.debug("Successfully retrieved {} monitor types", result.size());
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getI18nApps via adapter", e);
            throw new RuntimeException("Failed to invoke getI18nApps via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public List<ParamDefine> getMonitorParamDefines(String app) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMonitorParamDefines: {}", subjectSum);

            // Validate app parameter
            if (app == null || app.trim().isEmpty()) {
                throw new IllegalArgumentException("Monitor type/app parameter is required");
            }

            // Call getAppParamDefines method directly
            List<ParamDefine> result = appService.getAppParamDefines(app.toLowerCase().trim());

            log.debug("Successfully retrieved {} parameter definitions for monitor type: {}", result.size(), app);
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getAppParamDefines via adapter for app: {}", app, e);
            throw new RuntimeException("Failed to invoke getAppParamDefines via adapter: " + e.getMessage(), e);
        }
    }
}
