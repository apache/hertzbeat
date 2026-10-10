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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Durable, target-correlated proof for one successful read observation. */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AgentGroundingProof {

    public static final String VERSION = "grounding.v2";

    private String version;
    private String runUid;
    private String targetFingerprint;
    private String targetVersion;
    private Long entityId;
    private String toolName;
    private String toolCallId;
    private String inputHash;
    private String outputHash;
    private String observationKind;
    private Long monitorId;
    private Long alertId;
    private String alertType;
    private String metricKey;
    private String traceId;
    private String spanId;
    private Long start;
    private Long end;
    private String timezone;
    private String authorityHash;
    private Integer observationCount;
}
