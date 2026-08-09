/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.apache.hertzbeat.manager.support.MetadataWriteMaintenanceErrorResponse;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;

class MetadataWriteAdmissionHttpMappingTest {

    @ParameterizedTest
    @MethodSource("admissionFailures")
    void mapsEveryAdmissionCategoryToStableSafeHttpSemantics(
            MetadataWriteAdmissionException failure, HttpStatus expectedStatus) {
        var response = MetadataWriteMaintenanceErrorResponse.httpResponse(failure);

        assertThat(response.getStatusCode()).isEqualTo(expectedStatus);
        assertThat(response.getHeaders().getFirst("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getBody()).isEqualTo(new MetadataWriteMaintenanceErrorResponse(
                failure.code().wireCode(), failure.safeMessage()));
    }

    private static Stream<Arguments> admissionFailures() {
        return Stream.of(
                Arguments.of(MetadataWriteAdmissionException.metadataWritesPaused(),
                        HttpStatus.SERVICE_UNAVAILABLE),
                Arguments.of(MetadataWriteAdmissionException.operationConflict(), HttpStatus.CONFLICT),
                Arguments.of(MetadataWriteAdmissionException.drainTimeout(), HttpStatus.SERVICE_UNAVAILABLE),
                Arguments.of(MetadataWriteAdmissionException.acquisitionInterrupted(),
                        HttpStatus.SERVICE_UNAVAILABLE),
                Arguments.of(MetadataWriteAdmissionException.invalidRequest(), HttpStatus.BAD_REQUEST));
    }
}
