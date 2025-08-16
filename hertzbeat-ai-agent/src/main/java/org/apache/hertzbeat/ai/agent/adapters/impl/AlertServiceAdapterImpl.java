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
import org.apache.hertzbeat.ai.agent.adapters.AlertServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Implementation of the AlertServiceAdapter interface that provides access to alert information
 * through reflection by invoking the underlying alert service implementation.
 */
@Slf4j
@Component
public class AlertServiceAdapterImpl implements AlertServiceAdapter {

    @Override
    public Page<SingleAlert> getSingleAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize) {
        try {
            Object alertService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getSingleAlerts: {}", subjectSum);

            try {
                alertService = SpringContextHolder.getBean("alertServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertServiceImpl'");
            }

            assert alertService != null;
            log.debug("AlertService bean found: {}", alertService.getClass().getSimpleName());
            
            Method method = alertService.getClass().getMethod(
                    "getSingleAlerts",
                    String.class, String.class, String.class, String.class, int.class, int.class);

            @SuppressWarnings("unchecked")
            Page<SingleAlert> result = (Page<SingleAlert>) method.invoke(
                    alertService, status, search, sort, order, pageIndex, pageSize);
            
            log.debug("Successfully retrieved {} single alerts", result.getContent().size());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getSingleAlerts", e);
        } catch (Exception e) {
            log.error("Failed to invoke getSingleAlerts via adapter", e);
            throw new RuntimeException("Failed to invoke getSingleAlerts via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Page<GroupAlert> getGroupAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize) {
        try {
            Object alertService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getGroupAlerts: {}", subjectSum);

            try {
                alertService = SpringContextHolder.getBean("alertServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertServiceImpl'");
            }

            assert alertService != null;
            log.debug("AlertService bean found: {}", alertService.getClass().getSimpleName());
            
            Method method = alertService.getClass().getMethod(
                    "getGroupAlerts",
                    String.class, String.class, String.class, String.class, int.class, int.class);

            @SuppressWarnings("unchecked")
            Page<GroupAlert> result = (Page<GroupAlert>) method.invoke(
                    alertService, status, search, sort, order, pageIndex, pageSize);
            
            log.debug("Successfully retrieved {} group alerts", result.getContent().size());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getGroupAlerts", e);
        } catch (Exception e) {
            log.error("Failed to invoke getGroupAlerts via adapter", e);
            throw new RuntimeException("Failed to invoke getGroupAlerts via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public AlertSummary getAlertsSummary() {
        try {
            Object alertService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAlertsSummary: {}", subjectSum);

            try {
                alertService = SpringContextHolder.getBean("alertServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertServiceImpl'");
            }

            assert alertService != null;
            log.debug("AlertService bean found: {}", alertService.getClass().getSimpleName());
            
            Method method = alertService.getClass().getMethod("getAlertsSummary");

            AlertSummary result = (AlertSummary) method.invoke(alertService);
            
            log.debug("Successfully retrieved alerts summary");
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getAlertsSummary", e);
        } catch (Exception e) {
            log.error("Failed to invoke getAlertsSummary via adapter", e);
            throw new RuntimeException("Failed to invoke getAlertsSummary via adapter: " + e.getMessage(), e);
        }
    }
}