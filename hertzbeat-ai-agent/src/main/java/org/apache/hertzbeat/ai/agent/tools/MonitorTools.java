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

import org.springframework.ai.chat.model.ToolContext;

import java.util.List;

/**
 * Interface for Monitoring Tools
 */
public interface MonitorTools {

    String addMonitor(String name);

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

}
