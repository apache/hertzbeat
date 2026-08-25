/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

/** Writable operator-advertised addresses. */
@Data
public class PublicAccessConfigRequest {
    private String publicBaseUrl;
    private String serverOtlpHttpEndpoint;
    private String serverOtlpGrpcEndpoint;

    @JsonIgnore
    private boolean unknownFieldPresent;

    /** Rejects unknown input without retaining its name or value. */
    @JsonAnySetter
    public void markUnknownField(String name, Object value) {
        unknownFieldPresent = true;
    }
}
