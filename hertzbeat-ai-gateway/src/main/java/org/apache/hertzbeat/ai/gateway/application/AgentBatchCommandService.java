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

package org.apache.hertzbeat.ai.gateway.application;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.springframework.stereotype.Service;

/** Reuses the normal durable stream lifecycle after explicit batch admission. */
@Service
public class AgentBatchCommandService {
    private final AgentBatchContinuationAdmission admission;
    private final AgentCommandService commands;

    public AgentBatchCommandService(
            AgentBatchContinuationAdmission admission, AgentCommandService commands) {
        this.admission = admission;
        this.commands = commands;
    }

    public GatewayResponse.GatewayStreamResponse continueBatch(
            String runUid, String hash, GatewayEnvelope envelope) {
        var admitted = admission.admit(runUid, hash, envelope);
        return commands.invokeAdmittedStream(admitted.command(), admitted.admission());
    }
}
