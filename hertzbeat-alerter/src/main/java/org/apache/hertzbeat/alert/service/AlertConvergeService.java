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
import org.apache.hertzbeat.common.entity.alerter.AlertConverge;
import org.springframework.data.domain.Page;

/**
 * management interface service for alert converge
 */
public interface AlertConvergeService {
    /**
     * Verify the correctness of the request data parameters
     * @param alertConverge AlertConverge
     * @param isModify      whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown
     */
    void validate(AlertConverge alertConverge, boolean isModify) throws IllegalArgumentException;

    /**
     * New AlertConverge
     * @param alertConverge AlertConverge Entity
     * @throws RuntimeException Added procedure exception throwing
     */
    void addAlertConverge(AlertConverge alertConverge) throws RuntimeException;

    /**
     * Modifying an AlertConverge
     * @param alertConverge Alarm definition Entity
     * @throws RuntimeException Exception thrown during modification
     */
    void modifyAlertConverge(AlertConverge alertConverge) throws RuntimeException;

    /**
     * Obtain AlertConverge information
     * @param convergeId AlertConverge ID
     * @return AlertConverge
     * @throws RuntimeException An exception was thrown during the query
     */
    AlertConverge getAlertConverge(long convergeId) throws RuntimeException;


    /**
     * Delete AlertConverge in batches
     * @param convergeIds AlertConverge IDs
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteAlertConverges(Set<Long> convergeIds) throws RuntimeException;

    /**
     * Dynamic conditional query
     * @param convergeIds   Alarm Converge ID List
     * @param search        Search Name
     * @param sort          Sort field
     * @param order         Sort mode: asc: ascending, desc: descending
     * @param pageIndex     List current page
     * @param pageSize      Number of list pages
     * @return The query results
     */
    Page<AlertConverge> getAlertConverges(List<Long> convergeIds, String search, String sort, String order, int pageIndex, int pageSize);
}
