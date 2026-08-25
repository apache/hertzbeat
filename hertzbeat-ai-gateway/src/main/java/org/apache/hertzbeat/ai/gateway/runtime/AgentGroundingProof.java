/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
