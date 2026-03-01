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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents the result of a single SOP step execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StepResult {
    
    /**
     * Step ID
     */
    private String stepId;
    
    /**
     * Step type (tool, llm, condition, etc.)
     */
    private String type;
    
    /**
     * Execution status: SUCCESS, FAILED, SKIPPED
     */
    private String status;
    
    /**
     * Start timestamp in milliseconds
     */
    private long startTime;
    
    /**
     * End timestamp in milliseconds
     */
    private long endTime;
    
    /**
     * Duration in milliseconds
     */
    private long duration;
    
    /**
     * Step output/result
     */
    private Object output;
    
    /**
     * Error message if failed
     */
    private String error;
}
