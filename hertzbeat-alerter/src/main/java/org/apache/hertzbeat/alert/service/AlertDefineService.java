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

import jakarta.servlet.http.HttpServletResponse;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Alarm define manager service
 */
public interface AlertDefineService {

    /**
     * Verify the correctness of the request data parameters
     * @param alertDefine alertDefine
     * @param isModify whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown 
     */
    void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException;

    /**
     * New Alarm Definition
     * @param alertDefine Alarm definition Entity 
     * @throws RuntimeException Added procedure exception throwing 
     */
    void addAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Modifying an Alarm Definition 
     * @param alertDefine Alarm definition Entity 
     * @throws RuntimeException Exception thrown during modification 
     */
    void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * Deleting an Alarm Definition
     * @param alertId Alarm Definition ID 
     * @throws RuntimeException Exception thrown during deletion 
     */
    void deleteAlertDefine(long alertId) throws RuntimeException;

    /**
     * Obtain alarm definition information
     * @param alertId Monitor the ID 
     * @return AlertDefine
     * @throws RuntimeException An exception was thrown during the query 
     */
    AlertDefine getAlertDefine(long alertId) throws RuntimeException;


    /**
     * Delete alarm definitions in batches 
     * @param alertIds Alarm Definition IDs
     * @throws RuntimeException Exception thrown during deletion 
     */
    void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException;
    
    /**
     * Dynamic conditional query
     * @param defineIds     Alarm Definition ID List
     * @param search        Search-Target Expr Template
     * @param sort          Sort field
     * @param order         Sort mode: asc: ascending, desc: descending
     * @param pageIndex     List current page
     * @param pageSize      Number of list pages
     * @return The query results 
     */
    Page<AlertDefine> getAlertDefines(List<Long> defineIds, String search, String sort, String order, int pageIndex, int pageSize);

    /**
     * Export file configuration of specified type based on ID list and export file type
     * @param ids AlertDefine ID
     * @param type File Type
     * @param res Response
     * @throws Exception An exception was thrown during the export
     */
    void export(List<Long> ids, String type, HttpServletResponse res) throws Exception;

    /**
     * Add alarm threshold rules based on the uploaded alarm threshold file
     * @param file Upload File
     * @throws Exception An exception was thrown during the importConfig
     */
    void importConfig(MultipartFile file) throws Exception;

    /**
     * Get the real-time alarm definition list
     * @return Real-time alarm definition list
     */
    List<AlertDefine> getRealTimeAlertDefines();

    /**
     * Get define preview
     * @return Data queried based on expressions
     * @throws AlertExpressionException expression error
     */
    List<Map<String, Object>> getDefinePreview(String datasource, String type, String expr);
}
