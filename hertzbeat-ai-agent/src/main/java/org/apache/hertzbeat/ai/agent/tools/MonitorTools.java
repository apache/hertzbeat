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
     * @param database Database name (for database monitors)
     * @param additionalParams Additional app-specific parameters as JSON string (optional)
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
            String database,
            String additionalParams,
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
     * Comprehensive monitor querying with flexible filtering, pagination, and specialized views
     * @param ids Specific monitor IDs to retrieve (optional)
     * @param app Monitor type filter (linux, mysql, http, etc.)
     * @param status Monitor status (1=online, 2=offline, 3=unreachable, 0=paused, 9=all)
     * @param search Search in monitor names or hosts (partial matching)
     * @param labels Label filters, format: 'key1:value1,key2:value2'
     * @param sort Sort field (name, gmtCreate, gmtUpdate, status, app)
     * @param order Sort order (asc, desc)
     * @param pageIndex Page number starting from 0
     * @param pageSize Items per page (1-100 recommended)
     * @param includeStats Include status statistics summary
     * @return Comprehensive monitor information with optional statistics
     */
    String queryMonitors(
            List<Long> ids,
            String app,
            Byte status,
            String search,
            String labels,
            String sort,
            String order,
            Integer pageIndex,
            Integer pageSize,
            Boolean includeStats);

    /**
     * Get parameter definitions required for a specific monitor type
     * 
     * @param app Monitor type/application name (e.g., 'linux', 'mysql', 'redis')
     * @return Formatted string with parameter definitions including field names, types, and requirements
     */
    String getMonitorAdditionalParams(String app);
}