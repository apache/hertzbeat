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

package org.apache.hertzbeat.ai.tools;

/**
 * Database Tools interface for AI-powered database diagnostics.
 * Provides predefined safe queries for database health checks and troubleshooting.
 */
public interface DatabaseTools {
    
    /**
     * Get MySQL slow query statistics from performance_schema.
     */
    String getMySqlSlowQueries(Long monitorId, Integer limit);
    
    /**
     * Get MySQL current process list.
     */
    String getMySqlProcessList(Long monitorId);
    
    /**
     * Get MySQL lock wait information.
     */
    String getMySqlLockWaits(Long monitorId);
    
    /**
     * Get MySQL global status variables.
     */
    String getMySqlGlobalStatus(Long monitorId, String pattern);
    
    /**
     * Explain a SELECT query for performance analysis.
     */
    String explainQuery(Long monitorId, String query);
}
