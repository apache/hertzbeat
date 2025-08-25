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

import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import java.util.List;
import java.util.Map;

/**
 * Interface that provides access to monitor information by retrieving monitor data
 * through the underlying monitor service.
 */
public interface MonitorServiceAdapter {
    Page<Monitor> getMonitors(
            List<Long> ids,
            String app,
            String search,
            Byte status,
            String sort,
            String order,
            Integer pageIndex,
            Integer pageSize,
            String labels
    );

    /**
     * Add a new monitor
     *
     * @param monitor The monitor entity to create
     * @param params List of parameters for the monitor
     * @param collector Optional collector assignment
     * @return The created monitor ID
     */
    Long addMonitor(Monitor monitor, List<Param> params, String collector);

    /**
     * Get all available monitor types with their display names
     *
     * @param language Language code (e.g., "en-US", "zh-CN")
     * @return Map of monitor type key to display name
     */
    Map<String, String> getAvailableMonitorTypes(String language);

    /**
     * Get parameter definitions for a specific monitor type
     *
     * @param app Monitor type/application name (e.g., "linux", "mysql", "redis")
     * @return List of parameter definitions for the monitor type
     */
    List<ParamDefine> getMonitorParamDefines(String app);
}

