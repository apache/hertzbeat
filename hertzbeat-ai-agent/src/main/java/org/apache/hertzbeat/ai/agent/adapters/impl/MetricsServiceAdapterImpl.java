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
import org.apache.hertzbeat.ai.agent.adapters.MetricsServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.common.entity.dto.MetricsData;
import org.apache.hertzbeat.common.entity.dto.MetricsHistoryData;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Implementation of the MetricsServiceAdapter interface that provides access to metrics information
 * through reflection by invoking the underlying metrics service implementation.
 */
@Slf4j
@Component
public class MetricsServiceAdapterImpl implements MetricsServiceAdapter {

    @Override
    public Boolean getWarehouseStorageServerStatus() {
        try {
            Object metricsDataService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getWarehouseStorageServerStatus: {}", subjectSum);

            try {
                metricsDataService = SpringContextHolder.getBean("metricsDataServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'metricsDataServiceImpl'");
            }

            assert metricsDataService != null;
            log.debug("MetricsDataService bean found: {}", metricsDataService.getClass().getSimpleName());
            
            Method method = metricsDataService.getClass().getMethod("getWarehouseStorageServerStatus");

            Boolean result = (Boolean) method.invoke(metricsDataService);
            
            log.debug("Successfully retrieved warehouse storage server status: {}", result);
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getWarehouseStorageServerStatus", e);
        } catch (Exception e) {
            log.error("Failed to invoke getWarehouseStorageServerStatus via adapter", e);
            throw new RuntimeException("Failed to invoke getWarehouseStorageServerStatus via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public MetricsData getMetricsData(Long monitorId, String metrics) {
        try {
            Object metricsDataService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMetricsData: {}", subjectSum);

            try {
                metricsDataService = SpringContextHolder.getBean("metricsDataServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'metricsDataServiceImpl'");
            }

            assert metricsDataService != null;
            log.debug("MetricsDataService bean found: {}", metricsDataService.getClass().getSimpleName());
            
            Method method = metricsDataService.getClass().getMethod(
                    "getMetricsData",
                    Long.class, String.class);

            MetricsData result = (MetricsData) method.invoke(metricsDataService, monitorId, metrics);
            
            log.debug("Successfully retrieved metrics data for monitor {} and metrics {}", monitorId, metrics);
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getMetricsData", e);
        } catch (Exception e) {
            log.error("Failed to invoke getMetricsData via adapter for monitor {} and metrics {}", monitorId, metrics, e);
            throw new RuntimeException("Failed to invoke getMetricsData via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public MetricsHistoryData getMetricHistoryData(Long monitorId, String app, String metrics, String metric, String label, String history, Boolean interval) {
        try {
            Object metricsDataService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getMetricHistoryData: {}", subjectSum);

            try {
                metricsDataService = SpringContextHolder.getBean("metricsDataServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'metricsDataServiceImpl'");
            }

            assert metricsDataService != null;
            log.debug("MetricsDataService bean found: {}", metricsDataService.getClass().getSimpleName());
            
            Method method = metricsDataService.getClass().getMethod(
                    "getMetricHistoryData",
                    Long.class, String.class, String.class, String.class, String.class, String.class, Boolean.class);

            MetricsHistoryData result = (MetricsHistoryData) method.invoke(
                    metricsDataService, monitorId, app, metrics, metric, label, history, interval);
            
            log.debug("Successfully retrieved historical metrics data for monitor {} and metrics {}", monitorId, metrics);
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getMetricHistoryData", e);
        } catch (Exception e) {
            log.error("Failed to invoke getMetricHistoryData via adapter for monitor {} and metrics {}", monitorId, metrics, e);
            throw new RuntimeException("Failed to invoke getMetricHistoryData via adapter: " + e.getMessage(), e);
        }
    }
}