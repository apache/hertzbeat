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

package org.apache.hertzbeat.ai.gateway.runtime;

/**
 * Explicit normal-write contracts whose immutable goals are checked by the runtime before dispatch.
 */
public final class AgentApplicationMutationAuthority {
    private AgentApplicationMutationAuthority() {}

    public static boolean hasBoundContract(String tool) {
        return AgentApplicationMutationSemantics.supports(tool);
    }

    /** Adding a task contract does not silently expand an existing FULL consent scope. */
    public static boolean allowsFullMode(String tool) {
        return AgentMonitorMutationSemantics.supports(tool)
                || AgentDefinitionMutationSemantics.supports(tool)
                || AgentGrafanaMutationSemantics.supports(tool);
    }
}
