/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.instrumentation;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Explicit public OTLP endpoints owned by HertzBeat Server, never by a Collector row. */
@ConfigurationProperties(prefix = "hertzbeat.instrumentation.server")
public record ServerInstrumentationIntakeProperties(
        String profileId,
        String otlpHttpEndpoint,
        String otlpGrpcEndpoint,
        String authentication) implements InstrumentationIntakeProperties {
}
