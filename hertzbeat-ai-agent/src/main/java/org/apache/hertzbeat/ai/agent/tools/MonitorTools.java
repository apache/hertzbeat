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


package org.apache.hertzbeat.ai.agent.tools;


import java.util.List;

/**
 * Interface for Monitoring Tools
 */
public interface MonitorTools {

    /**
     * Add a new monitor with comprehensive configuration
     * 
     * @param name Monitor name
     * @param app Monitor type/application (e.g., 'linux', 'mysql', 'http')
     * @param host Target host (IP address or domain name)
     * @param port Target port (optional, depends on monitor type)
     * @param intervals Collection interval in seconds (default: 600)
     * @param username Username for authentication (optional)
     * @param password Password for authentication (optional)
     * @param description Monitor description (optional)
     * @return Result message with monitor ID if successful
     */
    String addMonitor(
            String name, 
            String app, 
            String host,
            Integer port,
            Integer intervals,
            String username,
            String password,
            String description
    );
    
    /**
     * List all available monitor types that can be added
     * 
     * @param language Language code for localized names (e.g., 'en-US', 'zh-CN')
     * @return Formatted string list of available monitor types with descriptions
     */
    String listMonitorTypes(String language);

    /**
     * Query monitor information with flexible filtering and pagination.
     * Supports filtering by monitor IDs, type, status, host, labels, sorting, and
     * pagination.
     * Returns results as plain JSON.
     */
    String listMonitors(
            List<Long> ids,
            String app,
            Byte status,
            String search,
            String labels,
            String sort,
            String order,
            Integer pageIndex,
            Integer pageSize);
    
    /**
     * Get parameter definitions required for a specific monitor type
     * 
     * @param app Monitor type/application name (e.g., 'linux', 'mysql', 'redis')
     * @return Formatted string with parameter definitions including field names, types, and requirements
     */
    String getMonitorParamDefines(String app);

}
