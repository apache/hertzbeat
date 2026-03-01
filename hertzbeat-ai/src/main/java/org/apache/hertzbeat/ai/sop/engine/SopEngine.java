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

package org.apache.hertzbeat.ai.sop.engine;

import java.util.Map;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import reactor.core.publisher.Flux;

/**
 * Engine for executing AI SOPs.
 */
public interface SopEngine {

    /**
     * Execute an SOP with the given input parameters (streaming mode).
     * @param definition The SOP definition to execute.
     * @param inputParams Input parameters for the SOP.
     * @return A stream of execution logs/results.
     */
    Flux<String> execute(SopDefinition definition, Map<String, Object> inputParams);
    
    /**
     * Execute an SOP synchronously and return a unified result.
     * Used for AI tool calls and programmatic access.
     * @param definition The SOP definition to execute.
     * @param inputParams Input parameters for the SOP.
     * @return Unified SOP execution result.
     */
    SopResult executeSync(SopDefinition definition, Map<String, Object> inputParams);
}
