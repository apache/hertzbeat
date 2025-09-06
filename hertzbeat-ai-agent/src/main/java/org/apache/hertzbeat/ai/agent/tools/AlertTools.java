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

/**
 * Tools for alert operations and alarm data queries
 */
public interface AlertTools {

    /**
     * Query alerts with comprehensive filtering and pagination
     * @param alertType Alert type (single, group, both)
     * @param status Alert status (firing, resolved, all)
     * @param search Search term for alert content or labels
     * @param sort Sort field (startAt, triggerTimes, status)
     * @param order Sort order (asc, desc)
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Formatted string with alert information
     */
    String queryAlerts(String alertType, String status, String search, String sort, String order, Integer pageIndex, Integer pageSize);

    /**
     * Get alerts summary statistics
     * @return Alert summary information including counts by status
     */
    String getAlertsSummary();


}
