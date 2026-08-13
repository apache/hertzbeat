/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;

/** Ownership, bounded staging, and one-shot lifecycle contracts for migration export. */
class PreparedMigrationExportTest {

    private static final ExportResponse METADATA =
            new ExportResponse("hertzbeat-migration.env", "text/plain");

    @Test
    void stagesIntoOwnedBytesBeforeWritingAndClearsItsIndependentSecret() throws Exception {
        SecretValue borrowed = SecretValue.of("export-secret");
        AtomicReference<SecretValue> rendererSecret = new AtomicReference<>();
        MigrationExportRenderer renderer = (secret, output) -> {
            rendererSecret.set(secret);
            output.write("rendered".getBytes(StandardCharsets.UTF_8));
        };
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed, renderer);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        try (StagedMigrationExport staged = prepared.stage()) {
            assertSame(METADATA, staged.metadata());
            assertThat(staged.size()).isEqualTo(8);
            assertThat(output.size()).isZero();
            staged.writeTo(output);
        }

        assertThat(output.toString(StandardCharsets.UTF_8)).isEqualTo("rendered");
        assertThat(rendererSecret.get()).isNotSameAs(borrowed);
        assertThat(rendererSecret.get().copy()).containsOnly('\0');
        assertThat(borrowed.copy()).containsExactly("export-secret".toCharArray());
        prepared.close();
        borrowed.close();
    }

    @Test
    void rendererFailureProducesNoStagedPayloadAndClearsSecret() {
        SecretValue borrowed = SecretValue.of("failure-secret");
        AtomicReference<SecretValue> rendererSecret = new AtomicReference<>();
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> {
                    rendererSecret.set(secret);
                    output.write("partial-private".getBytes(StandardCharsets.UTF_8));
                    throw new IOException("private-renderer-detail");
                });

        assertThatThrownBy(prepared::stage)
                .isInstanceOf(IOException.class)
                .hasMessageNotContaining("private-renderer-detail")
                .hasNoCause();
        assertThat(rendererSecret.get().copy()).containsOnly('\0');
        assertThat(borrowed.copy()).containsExactly("failure-secret".toCharArray());
        borrowed.close();
    }

    @Test
    void rejectsPayloadPastTheFixedLimitWithoutReturningPartialBytes() {
        SecretValue borrowed = SecretValue.of("bounded-secret");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> output.write(new byte[PreparedMigrationExport.MAX_EXPORT_BYTES + 1]));

        assertThatThrownBy(prepared::stage)
                .isInstanceOf(IOException.class)
                .hasNoCause()
                .hasMessageNotContaining("bounded-secret");
        borrowed.close();
    }

    @Test
    void rendererCloseAtEndDoesNotDiscardThePreparedPayload() throws Exception {
        SecretValue borrowed = SecretValue.of("close-at-end-secret");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> {
                    output.write("complete".getBytes(StandardCharsets.UTF_8));
                    output.close();
                });
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        try (StagedMigrationExport staged = prepared.stage()) {
            staged.writeTo(output);
        }

        assertThat(output.toString(StandardCharsets.UTF_8)).isEqualTo("complete");
        borrowed.close();
    }

    @Test
    void rendererCloseAndContinuedWriteRemainValid() throws Exception {
        SecretValue borrowed = SecretValue.of("close-then-write-secret");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> {
                    output.close();
                    output.write("after-close".getBytes(StandardCharsets.UTF_8));
                });
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        try (StagedMigrationExport staged = prepared.stage()) {
            staged.writeTo(output);
        }

        assertThat(output.toString(StandardCharsets.UTF_8)).isEqualTo("after-close");
        borrowed.close();
    }

    @Test
    void closeBeforeStageClearsOwnedSecretAndRejectsLaterConsumption() {
        SecretValue borrowed = SecretValue.of("unused-secret");
        AtomicReference<SecretValue> rendererSecret = new AtomicReference<>();
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> rendererSecret.set(secret));

        prepared.close();
        prepared.close();

        assertThatThrownBy(prepared::stage)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("unused-secret");
        assertThat(rendererSecret).hasValue(null);
        borrowed.close();
    }

    @Test
    void metadataAndDiagnosticsNeverExposeRendererOrSecret() {
        SecretValue borrowed = SecretValue.of("diagnostic-secret");
        MigrationExportRenderer renderer = (secret, output) -> { };
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed, renderer);

        assertSame(METADATA, prepared.metadata());
        assertThat(prepared.toString())
                .doesNotContain("diagnostic-secret")
                .doesNotContain(renderer.getClass().getName());
        prepared.close();
        borrowed.close();
    }

    @Test
    void firstRendererErrorRemainsPrimaryWhileOwnedMaterialIsCleared() {
        SecretValue borrowed = SecretValue.of("fatal-secret");
        AtomicReference<SecretValue> rendererSecret = new AtomicReference<>();
        AssertionError fatal = new AssertionError("renderer-fatal");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> {
                    rendererSecret.set(secret);
                    throw fatal;
                });

        assertThatThrownBy(prepared::stage).isSameAs(fatal).hasNoCause();
        assertThat(rendererSecret.get().copy()).containsOnly('\0');
        borrowed.close();
    }

    @Test
    void stagedBytesAreClearedOnCloseAndCannotBeWrittenAgain() throws Exception {
        SecretValue borrowed = SecretValue.of("staged-secret");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> output.write("payload".getBytes(StandardCharsets.UTF_8)));
        StagedMigrationExport staged = prepared.stage();
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        staged.close();
        staged.close();

        assertThatThrownBy(() -> staged.writeTo(output))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause();
        assertThat(output.size()).isZero();
        borrowed.close();
    }

    @Test
    void bufferAllocationErrorStillClearsOwnedSecretAndEndsPreparation() throws Exception {
        SecretValue borrowed = SecretValue.of("allocation-secret");
        AssertionError fatal = new AssertionError("buffer-allocation-fatal");
        PreparedMigrationExport prepared = PreparedMigrationExport.prepare(METADATA, borrowed,
                (secret, output) -> { }, limit -> {
                    throw fatal;
                });
        Field secretField = PreparedMigrationExport.class.getDeclaredField("ownedSecret");
        secretField.setAccessible(true);
        SecretValue ownedSecret = (SecretValue) secretField.get(prepared);

        assertThatThrownBy(prepared::stage).isSameAs(fatal);

        assertThat(ownedSecret.copy()).containsOnly('\0');
        assertThat(prepared.toString()).contains("CLOSED").doesNotContain("allocation-secret");
        prepared.close();
        borrowed.close();
    }
}
