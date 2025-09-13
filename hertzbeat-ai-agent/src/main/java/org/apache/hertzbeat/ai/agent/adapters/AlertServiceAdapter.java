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

import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.data.domain.Page;

/**
 * Interface that provides access to alert information by retrieving alert data
 * through the underlying alert service.
 */
public interface AlertServiceAdapter {

    /**
     * Get single alerts with filtering and pagination
     * @param status Alert status
     * @param search Search term
     * @param sort Sort field
     * @param order Sort order
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Page of single alerts
     */
    Page<SingleAlert> getSingleAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize);

    /**
     * Get group alerts with filtering and pagination
     * @param status Alert status
     * @param search Search term
     * @param sort Sort field
     * @param order Sort order
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Page of group alerts
     */
    Page<GroupAlert> getGroupAlerts(String status, String search, String sort, String order, int pageIndex, int pageSize);

    /**
     * Get alerts summary statistics
     * @return Alert summary information
     */
    AlertSummary getAlertsSummary();
}