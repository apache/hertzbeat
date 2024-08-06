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
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.data.domain.Page;

/**
 * management interface service for alert silence
 */
public interface AlertSilenceService {
    /**
     * Verify the correctness of the request data parameters
     * @param alertSilence AlertSilence
     * @param isModify     whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown
     */
    void validate(AlertSilence alertSilence, boolean isModify) throws IllegalArgumentException;

    /**
     * New AlertSilence
     * @param alertSilence AlertSilence Entity
     * @throws RuntimeException Added procedure exception throwing
     */
    void addAlertSilence(AlertSilence alertSilence) throws RuntimeException;

    /**
     * Modifying an AlertSilence
     * @param alertSilence Alarm definition Entity
     * @throws RuntimeException Exception thrown during modification
     */
    void modifyAlertSilence(AlertSilence alertSilence) throws RuntimeException;

    /**
     * Obtain AlertSilence information
     * @param silenceId AlertSilence ID
     * @return AlertSilence
     * @throws RuntimeException An exception was thrown during the query
     */
    AlertSilence getAlertSilence(long silenceId) throws RuntimeException;


    /**
     * Delete AlertSilence in batches
     * @param silenceIds AlertSilence IDs
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteAlertSilences(Set<Long> silenceIds) throws RuntimeException;

    /**
     * Dynamic conditional query
     * @param silenceIds    Alarm Silence ID
     * @param search        Search Name
     * @param sort          Sort field
     * @param order         Sort mode: asc: ascending, desc: descending
     * @param pageIndex     List current page
     * @param pageSize      Number of list pages
     * @return The query results
     */
    Page<AlertSilence> getAlertSilences(List<Long> silenceIds, String search, String sort, String order, int pageIndex, int pageSize);
}
