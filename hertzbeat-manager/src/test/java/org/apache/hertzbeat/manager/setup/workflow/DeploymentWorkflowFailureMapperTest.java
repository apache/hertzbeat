/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class DeploymentWorkflowFailureMapperTest {

    private final DeploymentWorkflowFailureMapper mapper = new DeploymentWorkflowFailureMapper();

    @Test
    void stableStoreFailuresBecomeCauseFreeHttpClassifications() {
        assertMapped(SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
        assertMapped(SetupErrorCode.OPERATION_NOT_FOUND, HttpStatus.NOT_FOUND);
        assertMapped(SetupErrorCode.OPERATION_CONFLICT, HttpStatus.CONFLICT);
        assertMapped(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, HttpStatus.SERVICE_UNAVAILABLE);
        assertMapped(SetupErrorCode.MIGRATION_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void everyOrdinaryRuntimeIsCauseFreeAndMetadataCodesRemainStable() {
        RuntimeException unknown = new IllegalStateException("private detail");
        SetupApiException api = new SetupApiException(SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);

        assertTranslated(unknown, SetupErrorCode.MIGRATION_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(mapper.translate(api)).isSameAs(api);
        assertTranslated(new MetadataMigrationException(MetadataMigrationErrorCode.SCHEMA),
                SetupErrorCode.MIGRATION_COPY_FAILED, HttpStatus.CONFLICT);
        assertTranslated(new MetadataMigrationException(MetadataMigrationErrorCode.COPY),
                SetupErrorCode.MIGRATION_COPY_FAILED, HttpStatus.CONFLICT);
        assertTranslated(new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION),
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, HttpStatus.CONFLICT);
        assertTranslated(new MetadataMigrationException(MetadataMigrationErrorCode.SEQUENCE),
                SetupErrorCode.MIGRATION_VERIFICATION_FAILED, HttpStatus.CONFLICT);
        assertTranslated(new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT),
                SetupErrorCode.MIGRATION_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
        assertTranslated(new MetadataMigrationException(
                        MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN),
                SetupErrorCode.CONFIG_RECOVERY_REQUIRED, HttpStatus.SERVICE_UNAVAILABLE);
        assertTranslated(new MetadataMigrationException(
                        MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN),
                SetupErrorCode.CONFIG_RECOVERY_REQUIRED, HttpStatus.SERVICE_UNAVAILABLE);
    }

    private void assertMapped(SetupErrorCode code, HttpStatus status) {
        assertTranslated(new MigrationOperationStoreException(code), code, status);
    }

    private void assertTranslated(
            RuntimeException failure, SetupErrorCode code, HttpStatus status) {
        RuntimeException translated = mapper.translate(failure);

        assertThat(translated).isInstanceOf(SetupApiException.class).hasNoCause();
        SetupApiException api = (SetupApiException) translated;
        assertThat(api.errorCode()).isEqualTo(code);
        assertThat(api.status()).isEqualTo(status);
    }
}
