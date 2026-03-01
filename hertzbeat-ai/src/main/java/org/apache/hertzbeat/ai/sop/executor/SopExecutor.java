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

package org.apache.hertzbeat.ai.sop.executor;

import org.apache.hertzbeat.ai.sop.model.SopStep;

import java.util.Map;

/**
 * Interface for SOP step executors.
 */
public interface SopExecutor {

    /**
     * Check if this executor supports the given step type.
     * @param type Step type.
     * @return true if supported.
     */
    boolean support(String type);

    /**
     * Execute the given step.
     * @param step The step to execute.
     * @param context Current execution context.
     * @return Execution result.
     */
    Object execute(SopStep step, Map<String, Object> context);
}
