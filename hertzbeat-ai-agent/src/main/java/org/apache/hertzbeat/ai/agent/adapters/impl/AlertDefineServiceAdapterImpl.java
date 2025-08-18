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
import org.apache.hertzbeat.ai.agent.adapters.AlertDefineServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.apache.hertzbeat.ai.agent.pojo.dto.Hierarchy;
import org.apache.hertzbeat.ai.agent.utils.UtilityClass;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;

/**
 * Implementation of the AlertDefineServiceAdapter interface that provides access to alert definition information
 * through reflection by invoking the underlying alert define service implementation.
 */
@Slf4j
@Component
public class AlertDefineServiceAdapterImpl implements AlertDefineServiceAdapter {

    @Override
    public AlertDefine addAlertDefine(AlertDefine alertDefine) {
        try {
            Object alertDefineService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for addAlertDefine: {}", subjectSum);

            try {
                alertDefineService = SpringContextHolder.getBean("alertDefineServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertDefineServiceImpl'");
            }

            assert alertDefineService != null;
            log.debug("AlertDefineService bean found: {}", alertDefineService.getClass().getSimpleName());
            
            Method method = alertDefineService.getClass().getMethod("addAlertDefine", AlertDefine.class);

            method.invoke(alertDefineService, alertDefine);
            
            log.debug("Successfully added alert define with ID: {}", alertDefine.getId());
            return alertDefine;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: addAlertDefine", e);
        } catch (Exception e) {
            log.error("Failed to invoke addAlertDefine via adapter", e);
            throw new RuntimeException("Failed to invoke addAlertDefine via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public Page<AlertDefine> getAlertDefines(String search, String app, Boolean enabled, String sort, String order, int pageIndex, int pageSize) {
        try {
            Object alertDefineService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAlertDefines: {}", subjectSum);

            try {
                alertDefineService = SpringContextHolder.getBean("alertDefineServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertDefineServiceImpl'");
            }

            assert alertDefineService != null;
            log.debug("AlertDefineService bean found: {}", alertDefineService.getClass().getSimpleName());
            
            Method method = alertDefineService.getClass().getMethod(
                    "getAlertDefines",
                    List.class, String.class, String.class, String.class, int.class, int.class);

            @SuppressWarnings("unchecked")
            Page<AlertDefine> result = (Page<AlertDefine>) method.invoke(
                    alertDefineService, null, search, sort, order, pageIndex, pageSize);
            
            log.debug("Successfully retrieved {} alert defines", result.getContent().size());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getAlertDefines", e);
        } catch (Exception e) {
            log.error("Failed to invoke getAlertDefines via adapter", e);
            throw new RuntimeException("Failed to invoke getAlertDefines via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public AlertDefine getAlertDefine(Long id) {
        try {
            Object alertDefineService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAlertDefine: {}", subjectSum);

            try {
                alertDefineService = SpringContextHolder.getBean("alertDefineServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertDefineServiceImpl'");
            }

            assert alertDefineService != null;
            log.debug("AlertDefineService bean found: {}", alertDefineService.getClass().getSimpleName());
            
            Method method = alertDefineService.getClass().getMethod("getAlertDefine", long.class);

            AlertDefine result = (AlertDefine) method.invoke(alertDefineService, id);
            
            log.debug("Successfully retrieved alert define with ID: {}", id);
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getAlertDefine", e);
        } catch (Exception e) {
            log.error("Failed to invoke getAlertDefine via adapter for ID: {}", id, e);
            throw new RuntimeException("Failed to invoke getAlertDefine via adapter: " + e.getMessage(), e);
        }
    }


    @Override
    public void toggleAlertDefineStatus(Long id, boolean enabled) {
        try {
            Object alertDefineService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for toggleAlertDefineStatus: {}", subjectSum);

            try {
                alertDefineService = SpringContextHolder.getBean("alertDefineServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertDefineServiceImpl'");
            }

            assert alertDefineService != null;
            log.debug("AlertDefineService bean found: {}", alertDefineService.getClass().getSimpleName());
            
            // First get the existing AlertDefine
            Method getMethod = alertDefineService.getClass().getMethod("getAlertDefine", long.class);
            AlertDefine alertDefine = (AlertDefine) getMethod.invoke(alertDefineService, id);
            
            if (alertDefine == null) {
                throw new RuntimeException("AlertDefine with ID " + id + " not found");
            }
            
            // Update the enable status
            alertDefine.setEnable(enabled);
            
            // Use modifyAlertDefine to save the changes
            Method modifyMethod = alertDefineService.getClass().getMethod("modifyAlertDefine", AlertDefine.class);
            modifyMethod.invoke(alertDefineService, alertDefine);
            
            log.debug("Successfully toggled alert define status for ID: {} to enabled: {}", id, enabled);

        } catch (Exception e) {
            log.error("Failed to invoke toggleAlertDefineStatus via adapter for ID: {}", id, e);
            throw new RuntimeException("Failed to invoke toggleAlertDefineStatus via adapter: " + e.getMessage(), e);
        }
    }

    @Override
    public AlertDefine modifyAlertDefine(AlertDefine alertDefine) {
        try {
            Object alertDefineService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for modifyAlertDefine: {}", subjectSum);

            try {
                alertDefineService = SpringContextHolder.getBean("alertDefineServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'alertDefineServiceImpl'");
            }

            assert alertDefineService != null;
            log.debug("AlertDefineService bean found: {}", alertDefineService.getClass().getSimpleName());
            
            Method method = alertDefineService.getClass().getMethod("modifyAlertDefine", AlertDefine.class);

            method.invoke(alertDefineService, alertDefine);
            
            log.debug("Successfully modified alert define with ID: {}", alertDefine.getId());
            return alertDefine;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: modifyAlertDefine", e);
        } catch (Exception e) {
            log.error("Failed to invoke modifyAlertDefine via adapter", e);
            throw new RuntimeException("Failed to invoke modifyAlertDefine via adapter: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves the application hierarchy for a given app and language.
     * Uses reflection to call the underlying app service method.
     *
     * @param app  The application name
     * @param lang The language code (optional, defaults to "en-US")
     * @return List of Hierarchy objects representing the app hierarchy
     */

    @Override
    public List<Hierarchy> getAppHierarchy(String app, String lang) {
        try {
            Object appService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject for getAppHierarchy: {}", subjectSum);

            try {
                appService = SpringContextHolder.getBean("appServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'appServiceImpl', trying by class name");
            }

            assert appService != null;
            log.debug("AppService bean found for getAppHierarchy: {}", appService.getClass().getSimpleName());

            // Provide default language if not specified
            if (lang == null || lang.trim().isEmpty()) {
                lang = "en-US";
            }

            // Call getAppHierarchy method: getAppHierarchy(String app, String lang)
            Method method = appService.getClass().getMethod("getAppHierarchy", String.class, String.class);

            List<?> managerHierarchies = (List<?>) method.invoke(appService, app, lang);

            // Convert manager DTOs to ai-agent DTOs
            List<Hierarchy> result = UtilityClass.convertToAgentHierarchies(managerHierarchies);

            log.debug("Successfully retrieved and converted {} hierarchies for app '{}'", result.size(), app);
            return result;

        } catch (Exception e) {
            log.error("Failed to get app hierarchy for app '{}': {}", app, e.getMessage(), e);
            throw new RuntimeException("Failed to get app hierarchy for " + app, e);
        }
    }

}