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
import java.util.Map;

/**
 * datasource service
 */
public interface DataSourceService {
    
    /**
     * execute query expr calculate
     * @param datasource datasource
     * @param expr query expr
     * @return result
     */
    List<Map<String, Object>> calculate(String datasource, String expr);

    /**
     * query result set from db
     * @param datasource sql or promql
     * @param expr query expr
     * @return result
     */
    List<Map<String, Object>> query(String datasource, String expr);

    /**
     * Get available datasource executors status
     * @return map containing available executors by type (promql, sql)
     */
    Map<String, Object> getAvailableExecutors();
} 
