/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.instrumentation;

/** Non-secret deployment properties shared by explicit OTLP destination types. */
interface InstrumentationIntakeProperties {

    String profileId();

    String otlpHttpEndpoint();

    String otlpGrpcEndpoint();

    String authentication();

    default boolean configured() {
        return hasText(profileId())
                || hasText(otlpHttpEndpoint())
                || hasText(otlpGrpcEndpoint())
                || hasText(authentication());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
