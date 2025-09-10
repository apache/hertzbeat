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

package org.apache.hertzbeat.ai.agent.adapters;

import org.apache.hertzbeat.ai.agent.pojo.dto.Hierarchy;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Interface that provides access to alert definition information by retrieving data
 * through the underlying alert define service.
 */
public interface AlertDefineServiceAdapter {

    /**
     * Add a new alert rule definition
     * @param alertDefine Alert definition to add
     * @return Created alert definition with ID
     */
    AlertDefine addAlertDefine(AlertDefine alertDefine);

    /**
     * Get alert definitions with filtering and pagination
     * @param search Search term
     * @param app Monitor type filter
     * @param enabled Enabled status filter
     * @param sort Sort field
     * @param order Sort order
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Page of alert definitions
     */
    Page<AlertDefine> getAlertDefines(String search, String app, Boolean enabled, String sort, String order, int pageIndex, int pageSize);

    /**
     * Get alert definition by ID
     * @param id Alert definition ID
     * @return Alert definition if found
     */
    AlertDefine getAlertDefine(Long id);

    /**
     * Enable or disable alert definition
     * @param id Alert definition ID
     * @param enabled Whether to enable
     */
    void toggleAlertDefineStatus(Long id, boolean enabled);

    /**
     * Modify/update an existing alert definition
     * @param alertDefine Alert definition to update
     * @return Updated alert definition
     */
    AlertDefine modifyAlertDefine(AlertDefine alertDefine);

    /**
     * Get specific app hierarchy structure
     * @param app App type
     * @param lang Language for localization
     * @return List of hierarchy objects for specific app
     */

    List<Hierarchy> getAppHierarchy(String app, String lang);
}