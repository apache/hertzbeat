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

package org.apache.hertzbeat.alert.service;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.springframework.data.domain.Page;

/**
 * management interface service for alert inhibit
 */
public interface AlertInhibitService {
    /**
     * Verify the correctness of the request data parameters
     * @param alertInhibit AlertInhibit
     * @param isModify     whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown
     */
    void validate(AlertInhibit alertInhibit, boolean isModify) throws IllegalArgumentException;

    /**
     * New AlertInhibit
     * @param alertInhibit AlertInhibit Entity
     * @throws RuntimeException Added procedure exception throwing
     */
    void addAlertInhibit(AlertInhibit alertInhibit) throws RuntimeException;

    /**
     * Modifying an AlertInhibit
     * @param alertInhibit Alarm definition Entity
     * @throws RuntimeException Exception thrown during modification
     */
    void modifyAlertInhibit(AlertInhibit alertInhibit) throws RuntimeException;

    /**
     * Obtain AlertInhibit information
     * @param inhibitId AlertInhibit ID
     * @return AlertInhibit
     * @throws RuntimeException An exception was thrown during the query
     */
    AlertInhibit getAlertInhibit(long inhibitId) throws RuntimeException;


    /**
     * Delete AlertInhibit in batches
     * @param inhibitIds AlertInhibit IDs
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteAlertInhibits(Set<Long> inhibitIds) throws RuntimeException;

    /**
     * Dynamic conditional query
     * @param inhibitIds    Alarm Silence ID
     * @param search        Search Name
     * @param sort          Sort field
     * @param order         Sort mode: asc: ascending, desc: descending
     * @param pageIndex     List current page
     * @param pageSize      Number of list pages
     * @return The query results
     */
    Page<AlertInhibit> getAlertInhibits(List<Long> inhibitIds, String search, String sort, String order, int pageIndex, int pageSize);
}
