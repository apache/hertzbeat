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

package org.apache.hertzbeat.ai.gateway.contract;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HertzBeat resource target referenced by an Agent Gateway request.
 */
@Data
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
public class AgentTargetRef {

    @Size(max = 64)
    private String version;

    @Positive
    private Long monitorId;

    @Positive
    private Long alertId;

    @Size(max = 16)
    private String alertType;

    @Positive
    private Long entityId;

    @Size(max = 128)
    private String collector;

    @Valid
    private AgentSignalRef signal;

    @Valid
    private AgentTopologyRef topology;

    @Valid
    private AgentTraceRef trace;

    @Valid
    private AgentLogRef log;

    @Valid
    private AgentServiceRef service;

    @Valid
    private AgentTargetAuthority authority;
}
