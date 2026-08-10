/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.junit.jupiter.api.Test;

/** Exact byte ownership contracts for finalized migration export staging. */
class BoundedMigrationExportBufferTest {

    @Test
    void finalPayloadConstructionErrorClearsTheStillOwnedBytes() throws Exception {
        AssertionError fatal = new AssertionError("staged-construction-fatal");
        AtomicReference<byte[]> attemptedBytes = new AtomicReference<>();
        BoundedMigrationExportBuffer buffer = new BoundedMigrationExportBuffer(64,
                (metadata, bytes, size) -> {
                    attemptedBytes.set(bytes);
                    throw fatal;
                });
        buffer.write("sensitive-payload".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> buffer.finish(new ExportResponse("export.env", "text/plain")))
                .isSameAs(fatal);

        assertThat(attemptedBytes.get()).containsOnly((byte) 0);
    }

    @Test
    void ownerCloseIsTerminalAndCannotRegrowOrFinalizeTheBuffer() throws Exception {
        BoundedMigrationExportBuffer buffer = new BoundedMigrationExportBuffer(64);
        buffer.write("sensitive-payload".getBytes(StandardCharsets.UTF_8));

        buffer.close();
        buffer.close();

        assertThatThrownBy(() -> buffer.write(1)).isInstanceOf(IOException.class);
        assertThatThrownBy(() -> buffer.finish(new ExportResponse("export.env", "text/plain")))
                .isInstanceOf(IllegalStateException.class);
    }
}
