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

package org.apache.hertzbeat.ai.sop.model;

/**
 * SOP output type enumeration.
 * Defines different types of SOP execution results.
 */
public enum OutputType {
    /**
     * Report type - generates a detailed report (e.g., daily inspection, fault analysis)
     */
    REPORT,
    
    /**
     * Simple type - returns simple success/failure result (e.g., restart, clear cache)
     */
    SIMPLE,
    
    /**
     * Data type - returns structured data (e.g., query resources, statistics)
     */
    DATA,
    
    /**
     * Action type - returns pending actions that require human confirmation
     */
    ACTION
}
