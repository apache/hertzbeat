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
import org.apache.hertzbeat.ai.adapters.AlertDefineServiceAdapter;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.service.AppService;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Implementation of the AlertDefineServiceAdapter interface that provides access to alert definition information
 * through direct service injection instead of reflection.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertDefineServiceAdapterImpl implements AlertDefineServiceAdapter {

    private final AlertDefineService alertDefineService;
    private final AppService appService;

    @Override
    public AlertDefine addAlertDefine(AlertDefine alertDefine) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for addAlertDefine: {}", subjectSum);

            alertDefineService.addAlertDefine(alertDefine);
            
            log.debug("Successfully added alert define with ID: {}", alertDefine.getId());
            return alertDefine;

        } catch (Exception e) {
            log.error("Failed to invoke addAlertDefine via adapter", e);
            throw new RuntimeException("Failed to invoke addAlertDefine via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Page<AlertDefine> getAlertDefines(String search, String app, Boolean enabled, String sort, String order, int pageIndex, int pageSize) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAlertDefines: {}", subjectSum);

            Page<AlertDefine> result = alertDefineService.getAlertDefines(null, search, sort, order, pageIndex, pageSize);
            
            log.debug("Successfully retrieved {} alert defines", result.getContent().size());
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getAlertDefines via adapter", e);
            throw new RuntimeException("Failed to invoke getAlertDefines via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public AlertDefine getAlertDefine(Long id) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAlertDefine: {}", subjectSum);

            AlertDefine result = alertDefineService.getAlertDefine(id);
            
            log.debug("Successfully retrieved alert define with ID: {}", id);
            return result;

        } catch (Exception e) {
            log.error("Failed to invoke getAlertDefine via adapter for ID: {}", id, e);
            throw new RuntimeException("Failed to invoke getAlertDefine via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public void toggleAlertDefineStatus(Long id, boolean enabled) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for toggleAlertDefineStatus: {}", subjectSum);

            // First get the existing AlertDefine
            AlertDefine alertDefine = alertDefineService.getAlertDefine(id);
            
            if (alertDefine == null) {
                throw new RuntimeException("AlertDefine with ID " + id + " not found");
            }
            
            // Update the enable status
            alertDefine.setEnable(enabled);
            
            // Use modifyAlertDefine to save the changes
            alertDefineService.modifyAlertDefine(alertDefine);
            
            log.debug("Successfully toggled alert define status for ID: {} to enabled: {}", id, enabled);

        } catch (Exception e) {
            log.error("Failed to invoke toggleAlertDefineStatus via adapter for ID: {}", id, e);
            throw new RuntimeException("Failed to invoke toggleAlertDefineStatus via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public AlertDefine modifyAlertDefine(AlertDefine alertDefine) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for modifyAlertDefine: {}", subjectSum);

            alertDefineService.modifyAlertDefine(alertDefine);
            
            log.debug("Successfully modified alert define with ID: {}", alertDefine.getId());
            return alertDefine;

        } catch (Exception e) {
            log.error("Failed to invoke modifyAlertDefine via adapter", e);
            throw new RuntimeException("Failed to invoke modifyAlertDefine via adapter: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves the application hierarchy for a given app and language.
     * Uses direct service injection instead of reflection.
     *
     * @param app  The application name
     * @param lang The language code (optional, defaults to "en-US")
     * @return List of Hierarchy objects representing the app hierarchy
     */
    @Override
    public List<Hierarchy> getAppHierarchy(String app, String lang) {
        try {
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAppHierarchy: {}", subjectSum);

            // Provide default language if not specified
            if (lang == null || lang.trim().isEmpty()) {
                lang = "en-US";
            }

            // Call getAppHierarchy method directly
            List<Hierarchy> result = appService.getAppHierarchy(app, lang);

            log.debug("Successfully retrieved and converted {} hierarchies for app '{}'", result.size(), app);
            return result;

        } catch (Exception e) {
            log.error("Failed to get app hierarchy for app '{}': {}", app, e.getMessage(), e);
            throw new RuntimeException("Failed to get app hierarchy for " + app, e);
        }
    }
}
